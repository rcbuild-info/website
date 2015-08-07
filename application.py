from cryptography.fernet import Fernet
from flask import Flask, render_template, Response, abort, session, request, url_for, flash, redirect
from flask.ext.github import GitHub, GitHubError
from flask_sslify import SSLify
from elasticsearch import Elasticsearch
import os
import os.path

import pylru

import base64
import requests
import json
import hmac
import urllib
import urlparse
from hashlib import sha1

application = app = Flask(__name__)
sslify = SSLify(app, skips=["healthz"])
app.config['GITHUB_CLIENT_ID'] = os.environ['GITHUB_CLIENT_ID']
app.config['GITHUB_CLIENT_SECRET'] = os.environ['GITHUB_CLIENT_SECRET']
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 365 * 24 * 60 * 60
app.secret_key = os.environ['SESSION_SECRET_KEY']

FERNET_KEY = os.environ['FERNET_KEY']
f = Fernet(FERNET_KEY)

es = Elasticsearch([os.environ['ES_HOST']])

github_cache = pylru.lrucache(64)

from git import Repo

github = GitHub(app)

def CloneOrPull():
  r = None
  if not os.path.isdir("parts-repo"):
    r = Repo.clone_from("https://github.com/rcbuild-info/parts.git", "parts-repo")
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
        small_part = {"manufacturer": part["manufacturer"],
                      "name": part["name"],
                      "category": part["category"]}
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
    return Response(json.dumps(SMALL_PARTS_BY_CATEGORY),
                    content_type="application/json")
  elif by == "id":
    return Response(json.dumps(SMALL_PARTS_BY_ID),
                    content_type="application/json")
  abort(404)

@app.route('/parts/<classification>')
def parts(classification):
    return render_template('main.html')

@app.route('/')
def index():
    return render_template('main.html')

@app.route('/update/buildIndex', methods=["GET", "HEAD", "OPTIONS", "POST"])
def updateBuildIndex():
  # Don't update if we can't validate the requester.
  if request.method == "POST":
    request_data = request.get_data()
    push_info = json.loads(request_data)
    user = push_info["repository"]["owner"]["name"]
    res = es.get(index='private', doc_type='githubsecret', id=user)
    if not res["found"]:
      abort(403)
    h = hmac.new(str(res["_source"]["secret"]), request.data, sha1)
    if not hmac.compare_digest(request.headers["X-Hub-Signature"], u"sha1=" + h.hexdigest()):
      abort(403)

    branch = push_info["ref"][len("refs/heads/"):]

    for commit in push_info["commits"]:
      if "build.json" in commit["modified"]:
        r = github.raw_request("GET", "repos/" + user + "/rcbuild.info-builds/contents/build.json?ref=" + commit["id"], headers={"accept": "application/vnd.github.v3.raw"})
        if r.status_code != requests.codes.ok:
          continue
        build = json.loads(r.text)
        snapshot = {
          "timestamp": commit["timestamp"],
          "user": user,
          "branch": branch,
          "build": build
        }
        res = es.index(index='public', doc_type='buildsnapshot', id=commit["id"], body=snapshot)
        if not res["created"] and res["_version"] < 1:
          return Response(status=requests.codes.server_error)
  return Response('ok')

@app.route('/builds')
def builds():
    return render_template('main.html')

@app.route('/createbuild')
def createbuild():
  return render_template('main.html')

@app.route('/edit/<username>/<repo>')
def editbuild(username, repo):
  return render_template('main.html')

@app.route('/compare/<primaryUsername>/<primaryBranch>/vs/<secondaryUsername>/<secondaryBranch>')
def comparebuild(primaryUsername, primaryBranch, secondaryUsername, secondaryBranch):
  return render_template('main.html')

@app.route('/build/<username>/<branch>')
def build(username, branch):
    return render_template('main.html')

def get_github(url, headers={}):
  has_if = False
  if "If-Modified-Since" in request.headers:
    headers["If-Modified-Since"] = request.headers["If-Modified-Since"]
    has_if = True
  if "If-None-Match" in request.headers:
    headers["If-None-Match"] = request.headers["If-None-Match"]
    has_if = True
  if not has_if and "o" not in session and url in github_cache:
    cached = github_cache[url]
    return Response(cached["text"],
                    status=cached["status_code"],
                    headers=cached["headers"])
  github_response = github.raw_request("GET", url, headers=headers)
  cache_response = url != "user"
  if github_response.status_code == requests.codes.ok:
    resp = Response(github_response.text)
    resp.headers['etag'] = github_response.headers['etag']
    resp.headers['last-modified'] = github_response.headers['last-modified']
    resp.headers['cache-control'] = github_response.headers['cache-control']
    if cache_response:
      github_cache[url] = {"text": github_response.text,
                           "status_code": github_response.status_code,
                           "headers": resp.headers}
    return resp
  elif github_response.status_code == requests.codes.not_modified:
    resp = Response(status=requests.codes.not_modified)
    if 'etag' in github_response.headers:
      resp.headers['etag'] = github_response.headers['etag']
    if 'last-modified' in github_response.headers:
      resp.headers['last-modified'] = github_response.headers['last-modified']
    resp.headers['cache-control'] = github_response.headers['cache-control']
    return resp
  if cache_response:
    github_cache[url] = {"text": "",
                         "status_code": github_response.status_code,
                         "headers": {}}
  return Response(status=github_response.status_code)

def set_login_info(response, oauth_token):
  session.permanent = True
  session["o"] = f.encrypt(bytes(oauth_token))
  user_info = get_github("user", {})
  user_info = json.loads(user_info.get_data(True))
  # Insecure cookie is OK when testing
  secure = "TEST_GITHUB_TOKEN" not in os.environ
  response.set_cookie('u', user_info["login"], max_age=365 * 24 * 60 * 60, secure=secure)
  return response

@app.route('/login')
def login():
  if "TEST_GITHUB_TOKEN" in os.environ:
    next_url = request.args.get('next') or url_for('index')
    r = redirect(next_url)
    r = set_login_info(r, os.environ["TEST_GITHUB_TOKEN"])
    return r
  return github.authorize(scope="public_repo", redirect_uri="https://rcbuild.info" + url_for('authorized') + "?next=" + request.args.get('next'))

@app.route('/logout')
def logout():
    session.pop('o', None)
    r = redirect(request.args.get('next') or url_for('index'))
    # Insecure cookie is OK when testing
    secure = "TEST_GITHUB_TOKEN" not in os.environ
    r.set_cookie('u', '', max_age=0, secure=secure)
    return r

@app.route('/github-callback')
@github.authorized_handler
def authorized(oauth_token):
    next_url = request.args.get('next') or url_for('index')
    if oauth_token is None:
        flash("Authorization failed.")
        return redirect(next_url)

    r = redirect(next_url)
    r = set_login_info(r, oauth_token)
    return r

@github.access_token_getter
def token_getter():
  if request.path == "/update/buildIndex":
    return os.environ["READONLY_GITHUB_TOKEN"]
  if "o" in session:
    return f.decrypt(session["o"])
  return None

def part_helper(manufacturerID, partID):
  if manufacturerID in LINKS and partID in LINKS[manufacturerID]:
    url = '/part/' + "/".join(LINKS[manufacturerID][partID]) + ".json"
    if not application.debug:
      url = urlparse.urljoin("https://rcbuild.info", url)
    return redirect(url)
  if manufacturerID in PARTS_BY_ID and partID in PARTS_BY_ID[manufacturerID]:
    return json.dumps(PARTS_BY_ID[manufacturerID][partID])
  abort(404)

@app.route('/part/<manufacturerID>/<partID>.json')
def part_json(manufacturerID, partID):
  return part_helper(manufacturerID, partID)

@app.route('/part/UnknownManufacturer/<siteID>/<partID>.json')
def unknown_part_json(siteID, partID):
  return part_helper("UnknownManufacturer/" + siteID, partID)

def create_fork_and_branch(user, branch):
  # Create a fork of our base repo or get info on one that already exists.
  result = github.raw_request("POST",  "repos/rcbuild-info/rcbuild.info-builds/forks")
  if result.status_code != requests.codes.accepted:
    return Response(status=requests.codes.server_error)
  repo_info = json.loads(result.text)

  # Double check we have setup the webhook
  result = github.raw_request("GET",  "repos/" + user + "/rcbuild.info-builds/hooks")
  if result.status_code != requests.codes.ok:
    return Response(status=requests.codes.server_error)
  all_hooks = json.loads(result.text)
  hook_exists = False
  for hook in all_hooks:
    if hook["config"]["url"] == "https://rcbuild.info/update/buildIndex":
      hook_exists = True
      break

  if not hook_exists:
    secret = os.urandom(24)
    b64_secret = base64.b64encode(secret)
    res = es.index(index="private", doc_type="githubsecret", id=user, body={"secret": b64_secret})
    if not res["created"] and res["_version"] < 1:
      return Response(status=requests.codes.server_error)

    hook = {"name": "web",
            "config": {
              "url": "https://rcbuild.info/update/buildIndex",
              "content_type": "json",
              "secret": b64_secret
            },
            "events": ["push"],
            "active": True}
    result = github.raw_request("POST", "repos/" + user + "/rcbuild.info-builds/hooks", data=json.dumps(hook))
    if result.status_code != requests.codes.created:
      print(result.status_code)
      print(result.text)
      return Response(status=requests.codes.server_error)

  # Get all branches for the repo.
  result = github.raw_request("GET", "repos/" + user + "/rcbuild.info-builds/git/refs")
  if result.status_code != requests.codes.ok:
    print(result.status_code)
    print(result.text)
    return Response(status=requests.codes.server_error)
  ref_info = json.loads(result.text)

  # Determine the sha of heads/master
  master_sha = ref_info[0]["object"]["sha"]
  for ref in ref_info[1:]:
    if ref["ref"] == "refs/heads/master":
      master_sha = ref["object"]["sha"]
      break

  # Create a new branch for this build starting at heads/master.
  result = github.raw_request("POST", "repos/" + user + "/rcbuild.info-builds/git/refs", data=json.dumps({"ref": "refs/heads/" + branch, "sha": master_sha}))
  if result.status_code != requests.codes.created:
    print(result.status_code)
    print(result.text)
    return Response(status=requests.codes.server_error)

  # Update the default branch away from master if it was a new repo.
  if repo_info["default_branch"] == "master":
    result = github.raw_request("PATCH",
                                "repos/" + user + "/rcbuild.info-builds",
                                data=json.dumps({"name": "rcbuild.info-builds",
                                            "default_branch": branch,
                                            "homepage": "https://rcbuild.info/builds/" + user}))
    if result.status_code != requests.codes.ok:
      print(result.status_code)
      print(result.text)
      return Response(status=requests.codes.server_error)
  return Response()

def new_commit(user, branch, tree, message):
  # Get the sha of the current commit at head.
  result = github.raw_request("GET",  "repos/" + user + "/rcbuild.info-builds/git/refs/heads/" + urllib.quote_plus(branch))
  if result.status_code != requests.codes.ok:
    print(result.status_code)
    print(result.text)
    return Response(status=requests.codes.server_error)
  branch_info = json.loads(result.text)
  latest_commit_sha = branch_info["object"]["sha"]

  result = github.raw_request("GET", "repos/" + user + "/rcbuild.info-builds/git/commits/" + latest_commit_sha)
  if result.status_code != requests.codes.ok:
    print(result.status_code)
    print(result.text)
    return Response(status=requests.codes.server_error)
  commit_info = json.loads(result.text)
  last_tree_sha = commit_info["tree"]["sha"]

  result = github.raw_request("POST",
                              "repos/" + user + "/rcbuild.info-builds/git/trees",
                              data=json.dumps(
                                {"base_tree": last_tree_sha,
                                 "tree": tree
                                }))
  if result.status_code != requests.codes.created:
    print(result.status_code)
    print(result.text)
    return Response(status=requests.codes.server_error)
  new_tree_info = json.loads(result.text)
  new_tree_sha = new_tree_info["sha"]

  result = github.raw_request("POST",
                              "repos/" + user + "/rcbuild.info-builds/git/commits",
                              data=json.dumps(
                                {"message": message,
                                 "parents": [latest_commit_sha],
                                 "tree": new_tree_sha}))
  if result.status_code != requests.codes.created:
    print(result.status_code)
    print(result.text)
    return Response(status=requests.codes.server_error)
  new_commit_info = json.loads(result.text)
  new_commit_sha = new_commit_info["sha"]

  result = github.raw_request("POST",
                              "repos/" + user + "/rcbuild.info-builds/git/refs/heads/" + urllib.quote_plus(branch),
                              data=json.dumps(
                                {"sha": new_commit_sha}))
  if result.status_code != requests.codes.ok:
    print(result.status_code)
    print(result.text)
    return Response(status=requests.codes.server_error)

  return Response()

def update_build(user, branch):
  if int(request.headers["Content-Length"]) > 2048:
    return Response(status=requests.codes.bad_request)
  new_build_contents = request.get_data()
  new_tree = [{"path": "build.json",
               "mode": "100644",
               "type": "blob",
               "content": new_build_contents}]
  return new_commit(user, branch, new_tree, "Build update via https://rcbuild.info/build/" + user + "/" + branch + ".")


@app.route('/build/<user>/<branch>.json', methods=["GET", "HEAD", "OPTIONS", "POST"])
def build_json(user, branch):
  if request.method == "GET":
    build = get_github("repos/" + user + "/rcbuild.info-builds/contents/build.json?ref=refs/heads/" + urllib.quote_plus(branch), {"accept": "application/vnd.github.v3.raw"})
    if build.status_code in [requests.codes.ok, requests.codes.not_modified]:
      return build
    return Response(status=requests.codes.not_found)
  elif request.method == "POST":
    return create_fork_and_branch(user, branch)

@app.route('/build/<user>/<branch>/files', methods=["GET", "HEAD", "OPTIONS", "POST"])
def setting_upload(user, branch):
  if request.method != "POST":
    return Response(status=requests.codes.method_not_allowed)
  if int(request.headers["Content-Length"]) > 40*(2**10):
    print(request.headers["Content-Length"])
    return Response(status=requests.codes.bad_request)
  new_tree = []
  for filename in ["cleanflight_cli_dump.txt", "cleanflight_gui_backup.json", "build.json"]:
    content = None
    if filename in request.files:
      content = request.files[filename].read()
    elif filename in request.form:
      content = request.form[filename]
    else:
      continue
    new_tree.append(
      {"path": filename,
       "mode": "100644",
       "type": "blob",
       "content": content});

  # TODO(tannewt): Ensure that the file contents are from cleanflight.
  return new_commit(user, branch, new_tree, "Build update via https://rcbuild.info/build/" + user + "/" + branch + ".")

@app.route('/build/<user>/<branch>/<filename>')
def config_json(user, branch, filename):
    return get_github("repos/" + user + "/rcbuild.info-builds/contents/" + filename + "?ref=refs/heads/" + urllib.quote_plus(branch), {"accept": "application/vnd.github.v3.raw"})

@app.route('/partCategories.json')
def part_categories():
    return get_github("repos/rcbuild-info/part-skeleton/contents/partCategories.json", {"accept": "application/vnd.github.v3.raw"})

@app.route('/healthz')
def healthz():
  return Response(response="ok", content_type="Content-Type: text/plain; charset=utf-8", status=requests.codes.ok)

updatePartIndexHelper()
if __name__ == '__main__':
    application.run(debug = True)
    #application.run(host='0.0.0.0')
