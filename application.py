from cryptography.fernet import Fernet
from flask import Flask, render_template, Response, abort, session, request, url_for, flash, redirect
from flask.ext.github import GitHub
import os
import os.path

import base64
import requests
import json
import hmac
import urlparse
from hashlib import sha1

application = app = Flask(__name__)
app.config['GITHUB_CLIENT_ID'] = os.environ['GITHUB_CLIENT_ID']
app.config['GITHUB_CLIENT_SECRET'] = os.environ['GITHUB_CLIENT_SECRET']
app.config['PROPAGATE_EXCEPTIONS'] = True
app.secret_key = os.environ['SESSION_SECRET_KEY']

FERNET_KEY = os.environ['FERNET_KEY']
f = Fernet(FERNET_KEY)

from git import Repo

github = GitHub(app)

def CloneOrPull():
  r = None
  if not os.path.isdir("parts-repo"):
    r = Repo.clone_from("https://github.com/tannewt/rcbuild.info-parts.git", "parts-repo")
  else:
    r = Repo("parts-repo")
  fetch_info = r.remote().pull()

PARTS_BY_ID = {}
SMALL_PARTS_BY_ID = {}
SMALL_PARTS_BY_CATEGORY = {}
LINKS = {}

def addPart(dest, manufacturerID, partID, part):
  if manufacturerID not in dest:
    dest[manufacturerID] = {}
  dest[manufacturerID][partID] = part

def updatePartIndexHelper():
  CloneOrPull()
  new_parts_by_id = {}
  new_small_parts_by_id = {}
  new_small_parts_by_category = {}
  new_links = {}
  for dirpath, dirnames, filenames in os.walk("parts-repo"):
    manufacturerID = dirpath[len("parts-repo/"):]
    for filename in filenames:
      if not filename.endswith("json"):
        continue
      partID = filename[:-len(".json")]
      full_path = os.path.join(dirpath, filename)
      if os.path.islink(full_path):
        target = os.readlink(full_path)
        split = target.split("/")
        m = manufacturerID
        p = target
        if len(split) == 2:
          m, p = split
        addPart(new_links, manufacturerID, partID, (m, p[:-len(".json")]))
        continue
      with open(full_path, "r") as f:
        part = json.load(f)
        part["id"] = manufacturerID + "/" + partID
        small_part = {"manufacturer": part["manufacturer"], "name": part["name"]}
        if part["category"]:
          c = part["category"]
          if c not in new_small_parts_by_category:
            new_small_parts_by_category[c] = {}
          addPart(new_small_parts_by_category[c], manufacturerID, partID, small_part)
        addPart(new_small_parts_by_id, manufacturerID, partID, small_part)
        addPart(new_parts_by_id, manufacturerID, partID, part)
  global SMALL_PARTS_BY_CATEGORY
  global SMALL_PARTS_BY_ID
  global PARTS_BY_ID
  global LINKS
  SMALL_PARTS_BY_CATEGORY = new_small_parts_by_category
  SMALL_PARTS_BY_ID = new_small_parts_by_id
  PARTS_BY_ID = new_parts_by_id
  LINKS = new_links

@app.route('/update/partIndex', methods=["GET", "HEAD", "OPTIONS", "POST"])
def updatePartIndex():
  # Don't update if we can't validate the requester.
  if request.method == "GET":
    github_response = github.request("GET", "user")
    if github_response["id"] != 52649:
      abort(403)
  elif request.method == "POST":
    h = hmac.new(os.environ['GITHUB_PART_HOOK_HMAC'], request.data, sha1)
    if not hmac.compare_digest(request.headers["X-Hub-Signature"], u"sha1=" + h.hexdigest()):
      abort(403)
  updatePartIndexHelper()
  return 'ok'

@app.route('/partIndex/by/<by>.json')
def partIndex(by):
  if by == "category":
    return json.dumps(SMALL_PARTS_BY_CATEGORY)
  elif by == "id":
    return json.dumps(SMALL_PARTS_BY_ID)
  abort(404)

@app.route('/parts/<classification>')
def parts(classification):
    return render_template('main.html')

@app.route('/')
def index():
    return render_template('main.html')

@app.route('/build/<username>/<repo>')
def build(username, repo):
    return render_template('main.html')

@app.route('/login')
def login():
    return github.authorize(redirect_uri="https://rcbuild.info" + url_for('authorized') + "?next=" + request.args.get('next'))

@app.route('/logout')
def logout():
    session.pop('o', None)
    r = redirect(request.args.get('next') or url_for('index'))
    r.set_cookie('u', '', max_age=0, secure=True)
    return r

@app.route('/github-callback')
@github.authorized_handler
def authorized(oauth_token):
    next_url = request.args.get('next') or url_for('index')
    if oauth_token is None:
        flash("Authorization failed.")
        return redirect(next_url)

    session.permanent = True
    session["o"] = f.encrypt(bytes(oauth_token))
    r = redirect(next_url)
    r.set_cookie('u', 'tannewt', max_age=31 * 24 * 60, secure=True)
    return r

@github.access_token_getter
def token_getter():
  if "o" in session:
    return f.decrypt(session["o"])
  if "TEST_GITHUB_TOKEN" in os.environ:
    return os.environ["TEST_GITHUB_TOKEN"]
  return None

def get_github(url, headers):
  if "If-Modified-Since" in request.headers:
    headers["If-Modified-Since"] = request.headers["If-Modified-Since"]
  if "If-None-Match" in request.headers:
    headers["If-None-Match"] = request.headers["If-None-Match"]
  github_response = github.raw_request("GET", url, headers=headers)
  if github_response.status_code == requests.codes.ok:
    resp = Response(github_response.text)
    resp.headers['etag'] = github_response.headers['etag']
    resp.headers['last-modified'] = github_response.headers['last-modified']
    resp.headers['cache-control'] = github_response.headers['cache-control']
    return resp
  elif github_response.status_code == requests.codes.not_modified:
    resp = Response(status=requests.codes.not_modified)
    if 'etag' in github_response.headers:
      resp.headers['etag'] = github_response.headers['etag']
    if 'last-modified' in github_response.headers:
      resp.headers['last-modified'] = github_response.headers['last-modified']
    resp.headers['cache-control'] = github_response.headers['cache-control']
    return resp
  abort(404)

@app.route('/part/<manufacturer>/<name>.json')
def part_json(manufacturer, name):
  if manufacturer in LINKS and name in LINKS[manufacturer]:
    url = '/part/' + "/".join(LINKS[manufacturer][name]) + ".json"
    if not application.debug:
      url = urlparse.urljoin("https://rcbuild.info", url)
    return redirect(url)
  if manufacturer in PARTS_BY_ID and name in PARTS_BY_ID[manufacturer]:
    return json.dumps(PARTS_BY_ID[manufacturer][name])
  abort(404)

@app.route('/build/<user>/<repo>.json')
def build_json(user, repo):
    return get_github("repos/" + user + "/" + repo + "/contents/build.json", {"accept": "application/vnd.github.v3.raw"})

@app.route('/build/<user>/<repo>/<filename>')
def config_json(user, repo, filename):
    return get_github("repos/" + user + "/" + repo + "/contents/" + filename, {"accept": "application/vnd.github.v3.raw"})

@app.route('/partCategories.json')
def part_categories():
    return get_github("repos/tannewt/rcbuild.info-part-skeleton/contents/partCategories.json", {"accept": "application/vnd.github.v3.raw"})

updatePartIndexHelper()
if __name__ == '__main__':
    application.run(debug = True)
    #application.run(host='0.0.0.0')
