from cryptography.fernet import Fernet
from flask import Flask, render_template, Response, abort, session, request, url_for, flash, redirect
from flask.ext.github import GitHub
import os

import base64
import requests

application = app = Flask(__name__)
app.config['GITHUB_CLIENT_ID'] = os.environ['GITHUB_CLIENT_ID']
app.config['GITHUB_CLIENT_SECRET'] = os.environ['GITHUB_CLIENT_SECRET']
app.config['PROPAGATE_EXCEPTIONS'] = True
app.secret_key = os.environ['SESSION_SECRET_KEY']

FERNET_KEY = os.environ['FERNET_KEY']
f = Fernet(FERNET_KEY)

github = GitHub(app)

@app.route('/')
def index():
    return 'Hello World2!'

@app.route('/build/<username>/<repo>')
def build(username, repo):
    return render_template('build.html')

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
    print("banana")
    print(app.secret_key)
    next_url = request.args.get('next') or url_for('index')
    if oauth_token is None:
        flash("Authorization failed.")
        return redirect(next_url)

    print(oauth_token)
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
    return get_github("repos/tannewt/rcbuild.info-parts/contents/" + manufacturer + "/" + name + ".json", {"accept": "application/vnd.github.v3.raw"})

@app.route('/build/<user>/<repo>.json')
def build_json(user, repo):
    return get_github("repos/" + user + "/" + repo + "/contents/build.json", {"accept": "application/vnd.github.v3.raw"})

@app.route('/build/<user>/<repo>/<filename>')
def config_json(user, repo, filename):
    return get_github("repos/" + user + "/" + repo + "/contents/" + filename, {"accept": "application/vnd.github.v3.raw"})

@app.route('/partCategories.json')
def part_categories():
    return get_github("repos/tannewt/rcbuild.info-part-skeleton/contents/partCategories.json", {"accept": "application/vnd.github.v3.raw"})

if __name__ == '__main__':
    #application.run(debug = True)
    application.run(host='0.0.0.0')
