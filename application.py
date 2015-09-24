# -*- coding: utf-8 -*-

from cryptography.fernet import Fernet
from flask import Flask, render_template, Response, abort, session, request, url_for, flash, redirect
from flask.ext.github import GitHub, GitHubError
from flask_sslify import SSLify
import elasticsearch
import os
import os.path

import pylru

import base64
import copy
import requests
import json
import hmac
import math
import urllib
import urlparse
from hashlib import sha1

import collections

def update(d, u):
    for k, v in u.iteritems():
        if isinstance(v, collections.Mapping):
            r = update(d.get(k, {}), v)
            d[k] = r
        else:
            d[k] = u[k]
    return d

class DomainDispatcher(object):
    def __init__(self, default, mapping):
        self.default = default
        self.mapping = mapping

    def __call__(self, environ, start_response):
        host = environ['HTTP_HOST'].split(':')[0]
        app = self.default
        if host in self.mapping:
          app = self.mapping[host]
        return app(environ, start_response)

# Init the rcbuild.info app.
rcbuild = Flask(__name__)
sslify = SSLify(rcbuild, skips=["healthz"])
rcbuild.config['GITHUB_CLIENT_ID'] = os.environ['GITHUB_CLIENT_ID']
rcbuild.config['GITHUB_CLIENT_SECRET'] = os.environ['GITHUB_CLIENT_SECRET']
rcbuild.config['GITHUB_BASE_URL'] = os.environ['GITHUB_BASE_URL']
rcbuild.config['GITHUB_AUTH_URL'] = os.environ['GITHUB_AUTH_URL']
rcbuild.config['PROPAGATE_EXCEPTIONS'] = True
rcbuild.config['PERMANENT_SESSION_LIFETIME'] = 365 * 24 * 60 * 60
rcbuild.secret_key = os.environ['SESSION_SECRET_KEY']

# Init the rcpart.info app.
rcpart = Flask(__name__)
rcpart_sslify = SSLify(rcpart, skips=["healthz"])

application = DomainDispatcher(rcbuild, {"rcbuild.info": rcbuild,
                                         "rcbuild.local": rcbuild,
                                         "rcpart.info": rcpart,
                                         "rcpart.local": rcpart})

FERNET_KEY = os.environ['FERNET_KEY']
f = Fernet(FERNET_KEY)

es = elasticsearch.Elasticsearch([os.environ['ES_HOST']])

SILENT_COMMIT_MESSAGE = "Silently upgrade - "

partCategories_string = ""
partCategories = {}

buildSkeleton = {}
infoSkeleton = {}

github_cache = pylru.lrucache(64)

from git import Repo

github = GitHub(rcbuild)

SOCIAL_BOTS = ["facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
               "facebookexternalhit/1.1",
               "Mozilla/5.0 (compatible; redditbot/1.0; +http://www.reddit.com/feedback)",
               "Twitterbot",
               "Pinterest",
               "Google (+https://developers.google.com/+/web/snippet/)",
               "Mozilla/5.0 (compatible; Google-Structured-Data-Testing-Tool +http://developers.google.com/structured-data/testing-tool/)"]

def is_social_bot():
  for bot in SOCIAL_BOTS:
    if bot in request.user_agent.string:
      return True
  return False

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

@rcbuild.route('/update/partIndex', methods=["GET", "HEAD", "OPTIONS", "POST"])
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

@rcbuild.route('/partIndex/by/<by>.json')
def partIndex(by):
  if by == "category":
    return Response(json.dumps(SMALL_PARTS_BY_CATEGORY),
                    content_type="application/json")
  elif by == "id":
    return Response(json.dumps(SMALL_PARTS_BY_ID),
                    content_type="application/json")
  abort(404)

@rcbuild.route('/parts/<classification>')
def parts(classification):
    return render_template('main.html')

@rcbuild.route('/')
def index():
    return render_template('main.html')

@rcbuild.route('/update/buildIndex', methods=["GET", "HEAD", "OPTIONS", "POST"])
def updateBuildIndex():
  # Don't update if we can't validate the requester.
  if request.method == "POST":
    request_data = request.get_data()
    push_info = json.loads(request_data)
    if "name" not in push_info["repository"]["owner"]:
      print("owner missing name")
      print(push_info["repository"])
      abort(403)
    user = push_info["repository"]["owner"]["name"]

    res = es.get(index='private', doc_type='githubsecret', id=user)
    if not res["found"]:
      print("couldn't find github secret")
      abort(403)
    h = hmac.new(str(res["_source"]["secret"]), request.data, sha1)
    if not hmac.compare_digest(request.headers["X-Hub-Signature"], u"sha1=" + h.hexdigest()):
      print("couldn't verify hmac")
      abort(403)

    branch = push_info["ref"][len("refs/heads/"):]

    if user == "tannewt" and branch.startswith(("test", "Test")):
      return Response('ok')

    if branch.startswith("patch"):
      return Response('ok')

    # Ignore the push notification we get when a new branch is created.
    if push_info["before"] == "0000000000000000000000000000000000000000" or len(push_info["commits"]) == 0:
      print("Dropping notification of creation of " + push_info["ref"] + " in " + push_info["repository"]["full_name"])
      return Response('ok')

    res = None
    try:
      res = es.get(index='builds', doc_type='buildsnapshot', id=push_info["before"])
    except elasticsearch.TransportError as e:
      print("elastic search error fetching current", e, push_info["before"])
      pass
    current_snapshot = None
    current_doc_id = {"_index": "builds", "_type": "buildsnapshot", "_id": push_info["before"]}
    updating = False
    if res and res["found"]:
      current_snapshot = res["_source"]
      updating = True

    previous_snapshot = None
    previous_doc_id = None

    # We do a bulk update to the index to minimize update cost.
    actions = []
    for commit in push_info["commits"]:
      # We bump the snapshot if settings or parts change but not other things
      # such as flights. Flights will only impact snapshot stats, not structure.
      if (current_snapshot == None or
          ("build.json" in commit["modified"] and
           not commit["message"].startswith(SILENT_COMMIT_MESSAGE)) or
          "cleanflight_cli_dump.txt" in commit["modified"] or
          "cleanflight_gui_backup.txt" in commit["modified"] or
          "cleanflight_cli_dump.txt" in commit["added"] or
          "cleanflight_gui_backup.txt" in commit["added"]):
        # Finalize the previous snapshot.
        if previous_snapshot:
          actions.append({"index": previous_doc_id})
          actions.append(previous_snapshot)
        previous_snapshot = current_snapshot
        previous_doc_id = copy.copy(current_doc_id)
        if previous_snapshot:
          previous_snapshot["next_snapshot"] = commit["id"]

        # Create a new snapshot.
        current_snapshot = {
          "timestamp": commit["timestamp"],
          "user": user,
          "branch": branch,
          "previous_snapshot": previous_doc_id["_id"],
          "commits": [],
          "next_snapshot": None
        }
      elif updating:
        # The id of a snapshot is the last commit so we delete the old current
        # doc when a commit is added and load the previous snapshot so we can
        # update its next.
        actions.append({"delete": copy.copy(current_doc_id)})

        if "previous_snapshot" in current_snapshot:
          previous_doc_id = {"_index": "builds", "_type": "buildsnapshot", "_id": current_snapshot["previous_snapshot"]}
          res = None
          try:
            res = es.get(index='builds', doc_type='buildsnapshot', id=previous_doc_id["_id"])
          except elasticsearch.TransportError as e:
            print("elastic search error fetching previous", e, previous_doc_id)
            pass
          if res and res["found"]:
            previous_snapshot = res["_source"]
          else:
            previous_doc_id = None
      if previous_snapshot:
        previous_snapshot["next_snapshot"] = commit["id"]
      if current_snapshot:
        if "build" not in current_snapshot or "build.json" in commit["modified"] or "build.json" in commit["added"]:
          r = github.raw_request("GET", "repos/" + user + "/rcbuild.info-builds/contents/build.json?ref=" + commit["id"], headers={"accept": "application/vnd.github.v3.raw"})
          if r.status_code == requests.codes.ok:
            current_snapshot["build"] = json.loads(r.text)
        # Update to the latest info.
        if "info" not in current_snapshot or "info.json" in commit["modified"] or "info.json" in commit["added"]:
          r = github.raw_request("GET", "repos/" + user + "/rcbuild.info-builds/contents/info.json?ref=" + commit["id"], headers={"accept": "application/vnd.github.v3.raw"})
          if r.status_code == requests.codes.ok:
            current_snapshot["info"] = json.loads(r.text)
        current_snapshot["commits"].append(commit["id"])
        if not commit["message"].startswith(SILENT_COMMIT_MESSAGE):
          current_snapshot["timestamp"] = commit["timestamp"]
        current_doc_id["_id"] = commit["id"]
      updating = False

    if previous_snapshot:
      actions.append({"index": previous_doc_id})
      actions.append(previous_snapshot)
    if current_snapshot:
      actions.append({"index": current_doc_id})
      actions.append(current_snapshot)

    es.bulk(index='builds', doc_type='buildsnapshot', body=actions)

  return Response('ok')

def filtered_shoulds(f, shoulds, size=5, sort=None, from_=0):
  query = {"query": {"filtered": {"filter": f, "query": {"bool": {"should": shoulds}}}}, "size": size, "from": from_}
  if sort:
    query["sort"] = sort
  return query

@rcbuild.route('/similar/builds/<user>/<branch>')
def similar_builds(user, branch):
  ref = None
  if "commit" in request.args:
    ref = request.args["commit"]
  else:
    ref = "refs/heads/" + urllib.quote_plus(branch.encode('utf8'))
  build = get_github("repos/" + user + "/rcbuild.info-builds/contents/build.json?ref=" + ref, {"accept": "application/vnd.github.v3.raw"}, use_cache_even_when_logged_in=True)
  if build.status_code != requests.codes.ok:
    return Response(status=requests.codes.server_error)
  build = json.loads(build.get_data(True))

  not_this_build = {"bool": {"must": [{"term": {"user": user}}, {"term": {"branch": branch}}]}}
  shoulds = []
  for category in build["config"]:
    t = "term"
    term = {category: {"value": build["config"][category]}}
    if isinstance(build["config"][category], list):
      t = "terms"
      term = {category: build["config"][category]}

    if category in partCategories["categories"] and "similarBoost" in partCategories["categories"][category]:
      if t == "term":
        term[category]["boost"] = partCategories["categories"][category]["similarBoost"]
      else:
        term["boost"] = partCategories["categories"][category]["similarBoost"]
    shoulds.append({t: term})
  searches = []
  other_musts = {"missing": {"field": "next_snapshot"}}
  other_size = 10
  if "u" in request.cookies:
    searches.append({"index": "builds", "doc_type": "buildsnapshot"})
    f = {"bool":
          {"must": [{"missing": {"field": "next_snapshot"}},
                    {"term": {"user": request.cookies["u"]}}],
           "must_not" : not_this_build
    }}
    other_musts = [other_musts,
                   {"not": {"term": {"user": request.cookies["u"]}}}]
    searches.append(filtered_shoulds(f, shoulds))
    other_size = 5
  searches.append({"index": "builds", "doc_type": "buildsnapshot"})
  f = {"bool":
        {"must": other_musts,
         "must_not" : not_this_build
  }}
  searches.append(filtered_shoulds(f, shoulds, size=other_size))
  res = es.msearch(body=searches)
  response = {}
  if len(res["responses"]) > 1:
    response["yours"] = []
    for hit in res["responses"][0]["hits"]["hits"]:
      hit = hit["_source"]
      response["yours"].append({"user": hit["user"], "branch": hit["branch"]})
  response["others"] = []
  for hit in res["responses"][len(res["responses"]) - 1]["hits"]["hits"]:
    hit = hit["_source"]
    response["others"].append({"user": hit["user"], "branch": hit["branch"]})
  return Response(json.dumps(response))

def get_part(partID):
  if "/" not in partID:
    return None
  split = partID.rsplit("/", 1)
  manufacturerID = split[0]
  partID = split[1]
  while manufacturerID in LINKS and partID in LINKS[manufacturerID]:
    manufacturerID = LINKS[manufacturerID][partID][0]
    partID = LINKS[manufacturerID][partID][1]

  if manufacturerID in PARTS_BY_ID and partID in PARTS_BY_ID[manufacturerID]:
    return PARTS_BY_ID[manufacturerID][partID]
  return None

def get_part_name(partID):
  part = get_part(partID)
  if part:
    return part["manufacturer"] + " " + part["name"]
  return partID

def get_build_snippet(build):
  parts = ["frame", "motor", "esc", "fc"]
  parts = [get_part_name(build["build"]["config"][x]) for x in parts]
  part_snippet = u" · ".join([x for x in parts if x != ""])
  snippet = {"user" : build["user"],
             "branch" : build["branch"],
             "snippet": part_snippet}
  if "info" in build and "media" in build["info"]:
    if len(build["info"]["media"]["photos"]) > 0 and not (len(build["info"]["media"]["photos"]) == 1 and build["info"]["media"]["photos"][0]["imgur"]["imageId"] == ""):
      snippet["thumb"] = build["info"]["media"]["photos"][-1]
    elif len(build["info"]["media"]["videos"]) > 0 and not (len(build["info"]["media"]["videos"]) == 1 and build["info"]["media"]["videos"][0]["youtube"]["videoId"] == ""):
      snippet["thumb"] = build["info"]["media"]["videos"][-1]
  return snippet

@rcbuild.route('/list/builds', defaults={"page": 1}, methods=["GET", "HEAD", "OPTIONS", "POST"])
@rcbuild.route('/list/builds/<page>', methods=["GET", "HEAD", "OPTIONS", "POST"])
def list_builds(page):
  if request.method != "POST":
    return Response(status=requests.codes.method_not_allowed)

  partIDs = json.loads(request.data)
  shoulds = []
  for partID in partIDs:
    part = get_part(partID)
    category = part["category"]
    if category == "":
      for c in partCategories["categories"]:
        term = {c: {"value": partID}}
        if "similarBoost" in partCategories["categories"][c]:
          term[c]["boost"] = partCategories["categories"][c]["similarBoost"]
        shoulds.append({"term": term})
    else:
      term = {category: {"value": partID}}
      if category in partCategories["categories"] and "similarBoost" in partCategories["categories"][category]:
        term[category]["boost"] = partCategories["categories"][category]["similarBoost"]
      shoulds.append({"term": term})

  page = int(page)
  searches = []
  s = []
  if len(shoulds) > 0:
    s.append({"_score": {"order": "desc"}})
  s.append({"timestamp": {"order": "desc"}})
  if "u" in request.cookies and page == 1:
    searches.append({"index": "builds", "doc_type": "buildsnapshot"})
    f = {"bool": {"must": [{"term": {"user": request.cookies["u"]}},
                           {"missing": {"field": "next_snapshot"}}]}}
    searches.append(filtered_shoulds(f, shoulds, size=100, sort=s))
  searches.append({"index": "builds", "doc_type": "buildsnapshot"})

  f = {"missing": {"field": "next_snapshot"}}
  searches.append(filtered_shoulds(f, shoulds, size=10, sort=s, from_=10 * (page - 1)))

  res = es.msearch(body=searches)
  response = {}
  total_builds = res["responses"][len(res["responses"]) - 1]["hits"]["total"]
  total_pages = int(math.ceil(total_builds / 10.))
  response["currentPage"] = page
  response["totalPages"] = total_pages
  if len(res["responses"]) > 1:
    response["yours"] = []
    for hit in res["responses"][0]["hits"]["hits"]:
      response["yours"].append(get_build_snippet(hit["_source"]))
  response["others"] = []
  for hit in res["responses"][len(res["responses"]) - 1]["hits"]["hits"]:
    response["others"].append(get_build_snippet(hit["_source"]))
  return Response(json.dumps(response))

@rcbuild.route('/builds')
def builds():
    return render_template('main.html')

@rcbuild.route('/createbuild')
def createbuild():
  return render_template('main.html')

@rcbuild.route('/edit/<username>/<repo>')
def editbuild(username, repo):
  return render_template('main.html')

@rcbuild.route('/compare/<primaryUsername>/<primaryBranch>/vs/<secondaryUsername>/<secondaryBranch>')
def comparebuild(primaryUsername, primaryBranch, secondaryUsername, secondaryBranch):
  return render_template('main.html')

@rcbuild.route('/compare/<primaryUsername>/<primaryBranch>/<primaryCommit>/vs/<secondaryUsername>/<secondaryBranch>/<secondaryCommit>')
def comparebuildcommits(primaryUsername, primaryBranch, primaryCommit, secondaryUsername, secondaryBranch, secondaryCommit):
  return render_template('main.html')

@rcbuild.route('/build/<username>/<branch>')
def oldBuild(username, branch):
    return redirect("/build/" + username + "/" + branch + "/")

def get_github(url, headers={}, use_cache_even_when_logged_in=False, skip_cache=False):
  has_if = False
  if request and "If-Modified-Since" in request.headers:
    headers["If-Modified-Since"] = request.headers["If-Modified-Since"]
    has_if = True
  if request and "If-None-Match" in request.headers:
    headers["If-None-Match"] = request.headers["If-None-Match"]
    has_if = True
  if not skip_cache and (use_cache_even_when_logged_in or (not has_if and "o" not in session)) and url in github_cache:
    cached = github_cache[url]
    return Response(cached["text"],
                    status=cached["status_code"],
                    headers=cached["headers"])
  github_response = github.raw_request("GET", url, headers=headers)
  cache_response = url != "user" and not skip_cache
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
  elif github_response.status_code == requests.codes.forbidden and github_response.headers["x-ratelimit-remaining"] == '0':
    print("ran out of freebie github quota!")
    return Response(status=429)

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
  secure = not rcbuild.debug
  response.set_cookie('u', user_info["login"], max_age=365 * 24 * 60 * 60, secure=secure)
  return response

@rcbuild.route('/login')
def login():
  if "TEST_GITHUB_TOKEN" in os.environ:
    next_url = request.args.get('next') or url_for('index')
    r = redirect(next_url)
    r = set_login_info(r, os.environ["TEST_GITHUB_TOKEN"])
    return r
  server = "https://rcbuild.info"
  if rcbuild.debug:
    server = "http://rcbuild.local:5000"
  return github.authorize(scope="public_repo", redirect_uri=server + url_for('authorized') + "?next=" + request.args.get('next'))

@rcbuild.route('/logout')
def logout():
    session.pop('o', None)
    r = redirect(request.args.get('next') or url_for('index'))
    # Insecure cookie is OK when testing
    secure = "TEST_GITHUB_TOKEN" not in os.environ
    r.set_cookie('u', '', max_age=0, secure=secure)
    return r

@rcbuild.route('/github-callback')
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
  if not request or request.path in ["/update/buildIndex", "/update/partCategories"]:
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

@rcbuild.route('/part/<manufacturerID>/<partID>.json')
def part_json(manufacturerID, partID):
  return part_helper(manufacturerID, partID)

@rcbuild.route('/part/UnknownManufacturer/<siteID>/<partID>.json')
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
    print("get webhooks failed", result.status_code)
    return Response(status=requests.codes.server_error)
  all_hooks = json.loads(result.text)
  hook_exists = False
  domain = "https://rcbuild.info"
  if rcbuild.debug:
    domain = "http://rcbuild.local:5000"
  hook_url = domain + "/update/buildIndex"
  for hook in all_hooks:
    if hook["config"]["url"] == hook_url:
      hook_exists = True
      break

  if not hook_exists:
    secret = os.urandom(24)
    b64_secret = base64.b64encode(secret)
    res = es.index(index="private", doc_type="githubsecret", id=user, body={"secret": b64_secret})
    if not res["created"] and res["_version"] < 1:
      print("put githubsecret failed")
      return Response(status=requests.codes.server_error)

    hook = {"name": "web",
            "config": {
              "url": hook_url,
              "content_type": "json",
              "secret": b64_secret
            },
            "events": ["push"],
            "active": True}
    result = github.raw_request("POST", "repos/" + user + "/rcbuild.info-builds/hooks", data=json.dumps(hook), headers={"Content-Type": "application/json"})
    if result.status_code != requests.codes.created:
      print(611, result.status_code)
      print(612, result.text)
      return Response(status=requests.codes.server_error)

  # Get all branches for the repo.
  result = github.raw_request("GET", "repos/" + user + "/rcbuild.info-builds/git/refs/heads/master")
  if result.status_code != requests.codes.ok:
    print(572, result.status_code)
    print(573, result.text)
    return Response(status=requests.codes.gateway_timeout)
  ref_info = json.loads(result.text)

  # Determine the sha of heads/master
  master_sha = ref_info["object"]["sha"]

  if not master_sha:
    print(581, "missing master branch")
    return Response(status=requests.codes.server_error)

  # Create a new branch for this build starting at heads/master.
  result = github.raw_request("POST", "repos/" + user + "/rcbuild.info-builds/git/refs", data=json.dumps({"ref": "refs/heads/" + branch, "sha": master_sha}), headers={"Content-Type": "application/json"})
  if result.status_code != requests.codes.created:
    print(587, result.status_code)
    print(588, result.text)
    return Response(status=requests.codes.server_error)

  # Update the default branch away from master if it was a new repo.
  if repo_info["default_branch"] == "master":
    result = github.raw_request("PATCH",
                                "repos/" + user + "/rcbuild.info-builds",
                                data=json.dumps({"name": "rcbuild.info-builds",
                                            "default_branch": branch,
                                            "homepage": "https://rcbuild.info/builds/" + user}),
                                headers={"Content-Type": "application/json"})
    if result.status_code != requests.codes.ok:
      print(599, result.status_code)
      print(600, result.text)
      return Response(status=requests.codes.server_error)
  return Response(json.dumps({"commit": master_sha}))

def new_commit(user, branch, tree, message):
  # Get the sha of the current commit at head.
  result = github.raw_request("GET",  "repos/" + user + "/rcbuild.info-builds/git/refs/heads/" + urllib.quote_plus(branch.encode('utf8')))
  if result.status_code != requests.codes.ok:
    print(608, result.status_code)
    print(609, result.text)
    return Response(status=requests.codes.server_error)
  branch_info = json.loads(result.text)
  latest_commit_sha = branch_info["object"]["sha"]

  result = github.raw_request("GET", "repos/" + user + "/rcbuild.info-builds/git/commits/" + latest_commit_sha)
  if result.status_code != requests.codes.ok:
    print(616, result.status_code)
    print(617, result.text)
    return Response(status=requests.codes.server_error)
  commit_info = json.loads(result.text)
  last_tree_sha = commit_info["tree"]["sha"]

  result = github.raw_request("POST",
                              "repos/" + user + "/rcbuild.info-builds/git/trees",
                              data=json.dumps(
                                {"base_tree": last_tree_sha,
                                 "tree": tree
                                }),
                              headers={"Content-Type": "application/json"})
  if result.status_code != requests.codes.created:
    print(629, result.status_code)
    print(630, result.text)
    return Response(status=requests.codes.server_error)
  new_tree_info = json.loads(result.text)
  new_tree_sha = new_tree_info["sha"]

  result = github.raw_request("POST",
                              "repos/" + user + "/rcbuild.info-builds/git/commits",
                              data=json.dumps(
                                {"message": message,
                                 "parents": [latest_commit_sha],
                                 "tree": new_tree_sha}),
                              headers={"Content-Type": "application/json"})
  if result.status_code != requests.codes.created:
    print(642, result.status_code)
    print(643, result.text)
    return Response(status=requests.codes.server_error)
  new_commit_info = json.loads(result.text)
  new_commit_sha = new_commit_info["sha"]

  result = github.raw_request("POST",
                              "repos/" + user + "/rcbuild.info-builds/git/refs/heads/" + urllib.quote_plus(branch.encode('utf8')),
                              data=json.dumps(
                                {"sha": new_commit_sha}),
                              headers={"Content-Type": "application/json"})
  if result.status_code != requests.codes.ok:
    print(653, result.status_code)
    print(654, result.text)
    return Response(status=requests.codes.server_error)

  return Response(json.dumps({"commit": new_commit_sha}))

def part_compare(a, b):
  a = a[0]
  b = b[0]
  categories = partCategories["categories"]
  if a not in categories or b not in categories:
    if a not in categories and b not in categories:
      return cmp(a, b)
    elif a not in categories:
      return 1
    elif b not in categories:
      return -1
  return categories[a]["order"] - categories[b]["order"]

def sort_dicts(d):
  d = collections.OrderedDict(sorted(d.iteritems()))
  for k in d:
    if isinstance(d[k], collections.Mapping):
      d[k] = sort_dicts(d[k])
    elif isinstance(d[k], collections.Sequence):
      for i in xrange(len(d[k])):
        if isinstance(d[k][i], collections.Mapping):
          d[k][i] = sort_dicts(d[k][i])
  return d

def maybe_upgrade_json(user, branch, build, info):
  if "u" not in request.cookies or request.cookies["u"] != user:
    return (build, info)
  ref = "refs/heads/" + urllib.quote_plus(branch.encode('utf8'))
  commit = False

  # Update the version of build.json.
  gh = get_github("repos/" + user + "/rcbuild.info-builds/contents/build.json?ref=" + ref, {"accept": "application/vnd.github.v3.raw"})
  existing_build = None
  try:
    existing_build = json.loads(gh.get_data(True))
  except ValueError:
    print("Build json parse failed for " + user + "/" + branch + "@" + str(commit) + " status " + str(gh.status_code) + " \"" + gh.get_data(True) + "\"")
    return (build, info)
  new_build = None
  messages = []
  if existing_build["version"] < buildSkeleton["version"]:
    new_build = copy.deepcopy(buildSkeleton)
    update(new_build, existing_build)
    # Intentionally update the version.
    new_build["version"] = buildSkeleton["version"]
    commit = True
    messages.append("Build file version.")

  # Update part ids when in links.
  temp_build = existing_build
  if new_build != None:
    temp_build = new_build
  part_updated = False
  for category, partIDs in temp_build["config"].iteritems():
    if isinstance(partIDs, list):
      for i, partID in enumerate(partIDs):
        if "/" not in partID:
          continue
        manufacturerID, partID = partID.rsplit("/", 1)
        replaced = False
        while manufacturerID in LINKS and partID in LINKS[manufacturerID]:
          manufacturerID, partID = LINKS[manufacturerID][partID]
          replaced = True
        if replaced:
          partIDs[i] = "/".join((manufacturerID, partID))
          part_updated = True
    elif "/" in partIDs:
      manufacturerID, partID = partIDs.rsplit("/", 1)
      replaced = False
      while manufacturerID in LINKS and partID in LINKS[manufacturerID]:
        manufacturerID, partID = LINKS[manufacturerID][partID]
        replaced = True
      if replaced:
        temp_build["config"][category] = "/".join((manufacturerID, partID))
        part_updated = True
  if part_updated:
    new_build = temp_build
    commit = True
    messages.append("Part IDs.")

  # Update the info file.
  if "version" in infoSkeleton:
    gh = get_github("repos/" + user + "/rcbuild.info-builds/contents/info.json?ref=" + ref, {"accept": "application/vnd.github.v3.raw"})
    new_info = None
    if gh.status_code == requests.codes.not_found:
      new_info = infoSkeleton
      commit = True
      messages.append("Add info file.")
    elif gh.status_code == requests.codes.ok:
      current_info = json.loads(gh.get_data(True))
      if "version" not in current_info or current_info["version"] < infoSkeleton["version"]:
        new_info = copy.deepcopy(infoSkeleton)
        update(new_info, current_info)
        # Intentionally update the version.
        new_info["version"] = infoSkeleton["version"]
        commit = True
        messages.append("Upgrade info file version.")

  if commit:
    new_tree = []
    if new_build != None:
      # Mimic the sort that the JSON does to minimize diffs on GitHub.
      new_build = sort_dicts(new_build)
      new_build["config"] = collections.OrderedDict(sorted(new_build["config"].iteritems(), cmp=part_compare))
      new_build_contents = json.dumps(new_build, indent=2, separators=(',', ': '))
      new_tree.append({"path": "build.json",
                       "mode": "100644",
                       "type": "blob",
                       "content": new_build_contents})
    if new_info != None:
      new_info_contents = json.dumps(new_info, indent=2, sort_keys=True, separators=(',', ': '))
      new_tree.append({"path": "info.json",
                       "mode": "100644",
                       "type": "blob",
                       "content": new_info_contents})

    c = new_commit(user, branch, new_tree, SILENT_COMMIT_MESSAGE + " ".join(messages))
    if c.status_code != requests.codes.ok:
      return (build, info)

    # Our upgrade worked so return the new versions.
    if new_build != None:
      build = new_build
    if new_info != None:
      info = new_info

  return (build, info)

def get_buildsnapshot(user, branch, commit=None):
  searchbody = None
  if commit:
    searchbody = {"query":{"bool":{"must":[{"prefix":{"buildsnapshot.commits":commit}}],"must_not":[],"should":[]}},"size":1,"sort":[{"timestamp": {"order": "desc"}}]}
  else:
    searchbody = {
      "query": {
        "bool": {
          "must": [
            {"term":{"buildsnapshot.branch":branch}},
            {"term":{"buildsnapshot.user":user}},
            {"constant_score":
              {"filter":
                {"missing":
                  {"field":"buildsnapshot.next_snapshot"}}}}],
          "must_not":[],
          "should":[]}},
      "size":1,
      "sort":[{"timestamp": {"order": "desc"}}]}
  res = es.search(index="builds", doc_type="buildsnapshot", body=searchbody)

  if res["hits"]["total"] == 1:
    build = res["hits"]["hits"][0]["_source"]
    if "info" not in build:
      build["info"] = None
    if "commit" not in request.args or request.args["commit"] == "HEAD":
      build["build"], build["info"] = maybe_upgrade_json(user, branch, build["build"], build["info"])
    return build

  # Fallback to looking in github.ref = None
  ref = None
  if "commit" in request.args:
    ref = request.args["commit"]
  else:
    ref = "refs/heads/" + urllib.quote_plus(branch.encode('utf8'))
  gh = get_github("repos/" + user + "/rcbuild.info-builds/contents/build.json?ref=" + ref, {"accept": "application/vnd.github.v3.raw"})
  if gh.status_code != requests.codes.ok:
    return None

  result = github.raw_request("GET",  "repos/" + user + "/rcbuild.info-builds/git/refs/heads/" + urllib.quote_plus(branch.encode('utf8')))
  if result.status_code != requests.codes.ok:
    print(727, result.status_code)
    print(728, result.text)
    return None
  branch_info = json.loads(result.text)
  latest_commit_sha = branch_info["object"]["sha"]

  parts = json.loads(gh.get_data(True))

  build = {"commits": [latest_commit_sha], "build": parts, "info": None, "user": user, "branch": branch}

  info = get_github("repos/" + user + "/rcbuild.info-builds/contents/info.json?ref=" + ref, {"accept": "application/vnd.github.v3.raw"})
  if info.status_code == requests.codes.ok:
    build["info"] = json.loads(info.get_data(True))

  if "commit" not in request.args or request.args["commit"] == "HEAD":
    build["build"], build["info"] = maybe_upgrade_json(user, branch, build["build"], build["info"])
  return build

def get_social_build_page(user, branch, commit):
  build = get_buildsnapshot(user, branch, commit)
  snippet = get_build_snippet(build)
  url = "https://rcbuild.info/build/" + user + "/" + branch + "/"
  if commit != None:
    url += commit
  video = None
  image = None
  if "thumb" in snippet:
    if "imgur" in snippet["thumb"]:
      image = "https://i.imgur.com/" + snippet["thumb"]["imgur"]["imageId"] + "." + snippet["thumb"]["imgur"]["extension"]
    elif "youtube" in snippet["thumb"]:
      image = "https://img.youtube.com/vi/" + snippet["thumb"]["youtube"]["videoId"] + "/maxresdefault.jpg"
      video = "https://www.youtube.com/embed/" + snippet["thumb"]["youtube"]["videoId"]
  return render_template('social.html',
                         title=(user + "/" + branch),
                         description=snippet["snippet"],
                         image=image,
                         url=url,
                         video=video)

@rcbuild.route('/build/<username>/<branch>/<commit>')
def buildCommit(username, branch, commit):
  if is_social_bot():
    return get_social_build_page(username, branch, commit)
  return render_template('main.html')

@rcbuild.route('/build/<username>/<branch>/')
def build(username, branch):
  if is_social_bot():
    return get_social_build_page(username, branch, None)
  return render_template('main.html')

@rcbuild.route('/build/<user>/<branch>.json', methods=["GET", "HEAD", "OPTIONS", "POST"])
def build_json(user, branch):
  if request.method == "GET":
    commit = None
    if "commit" in request.args:
      commit = request.args["commit"]
    build = get_buildsnapshot(user, branch, commit)
    if build == None:
      return Response(status=requests.codes.not_found)
    return Response(json.dumps(build))
  elif request.method == "POST":
    return create_fork_and_branch(user, branch)

@rcbuild.route('/build/<user>/<branch>/files', methods=["GET", "HEAD", "OPTIONS", "POST"])
def upload_files(user, branch):
  if request.method != "POST":
    return Response(status=requests.codes.method_not_allowed)
  if int(request.headers["Content-Length"]) > 40*(2**10):
    print("settings too large", request.headers["Content-Length"])
    return Response(status=requests.codes.bad_request)
  new_tree = []
  for filename in ["cleanflight_cli_dump.txt", "cleanflight_gui_backup.json", "build.json", "info.json"]:
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

  if len(new_tree) == 0:
    return Response(status=requests.codes.bad_request)

  # TODO(tannewt): Ensure that the file contents are from cleanflight.
  return new_commit(user, branch, new_tree, "Build update via https://rcbuild.info/build/" + user + "/" + branch + ".")

@rcbuild.route('/file/<user>/<branch>/<filename>')
def config_json(user, branch, filename):
  ref = None
  if "commit" in request.args:
    ref = request.args["commit"]
  else:
    ref = "refs/heads/" + urllib.quote_plus(branch.encode('utf8'))
  return get_github("repos/" + user + "/rcbuild.info-builds/contents/" + filename + "?ref=" + ref, {"accept": "application/vnd.github.v3.raw"})

def updatePartCategoriesHelper():
  global partCategories_string
  global partCategories

  resp = get_github("repos/rcbuild-info/part-skeleton/contents/partCategories.json", {"accept": "application/vnd.github.v3.raw"}, skip_cache=True)

  try:
    partCategories = json.loads(resp.get_data(True))
  except:
    print("Failed to parse partCategories.json")
    return
  partCategories_string = resp.get_data(True)

@rcbuild.route('/update/partCategories', methods=["GET", "HEAD", "OPTIONS", "POST"])
def updatePartCategories():
  if request.method != "POST":
    abort(405)

  h = hmac.new(os.environ['GITHUB_PART_HOOK_HMAC'], request.data, sha1)
  if not rcbuild.debug and not hmac.compare_digest(request.headers["X-Hub-Signature"], u"sha1=" + h.hexdigest()):
    abort(403)

  updatePartCategoriesHelper()
  return 'ok'

@rcbuild.route('/partCategories.json')
def part_categories():
    return Response(partCategories_string)

def updateMapping(mapping, skeleton):
  for key in skeleton:
    if isinstance(skeleton[key], dict):
      if key not in mapping:
        mapping[key] = {"properties" : {}, "dynamic": False}
      updateMapping(mapping[key]["properties"], skeleton[key])
    elif isinstance(skeleton[key], list) and len(skeleton[key]) == 1:
      if key not in mapping:
        mapping[key] = {"properties" : {}, "dynamic": False}
      updateMapping(mapping[key]["properties"], skeleton[key][0])
    elif key in mapping:
      continue
    elif isinstance(skeleton[key], int):
      mapping[key] = {"type": "integer"}
    else:
      mapping[key] = {"type": "string", "index": "not_analyzed"}
      # TODO(tannewt): Create key + "_fuzzy" fields that are analyzed.

def updateBuildSkeletonHelper():
  global buildSkeleton
  global infoSkeleton

  build_response = get_github("repos/rcbuild-info/rcbuild.info-builds/contents/build.json", {"accept": "application/vnd.github.v3.raw"}, skip_cache=True)

  buildSkeleton = json.loads(build_response.get_data(True))

  info_response = get_github("repos/rcbuild-info/rcbuild.info-builds/contents/info.json", {"accept": "application/vnd.github.v3.raw"}, skip_cache=True)
  if info_response.status_code == requests.codes.ok:
    infoSkeleton = json.loads(info_response.get_data(True))

  indices = elasticsearch.client.IndicesClient(es)
  mapping = indices.get_mapping("builds", "buildsnapshot")
  buildsnapshot = mapping["builds"]["mappings"]["buildsnapshot"]
  props = buildsnapshot["properties"]
  if "properties" not in props["build"]:
    props["build"]["properties"] = {}
  if "info" not in props:
    props["info"] = {"properties": {}, "type": "object", "dynamic": False}
  if "properties" not in props["info"]:
    props["info"]["properties"] = {}
  updateMapping(props["build"]["properties"], buildSkeleton)
  updateMapping(props["info"]["properties"], infoSkeleton)
  indices.put_mapping(index="builds", doc_type="buildsnapshot",body=mapping["builds"]["mappings"])

@rcbuild.route('/update/buildSkeleton', methods=["GET", "HEAD", "OPTIONS", "POST"])
def updateBuildSkeleton():
  if request.method != "POST":
    abort(405)

  h = hmac.new(os.environ['GITHUB_PART_HOOK_HMAC'], request.data, sha1)
  if not rcbuild.debug and not hmac.compare_digest(request.headers["X-Hub-Signature"], u"sha1=" + h.hexdigest()):
    abort(403)

  updateBuildSkeletonHelper()
  return 'ok'

@rcbuild.route('/healthz')
def healthz():
  return Response(response="ok", content_type="Content-Type: text/plain; charset=utf-8", status=requests.codes.ok)

@rcpart.route('/')
def rcpart_home():
  return "hello rcpart world"

@rcpart.route('/part/<manufacturerID>/<partID>')
def part(manufacturerID, partID):
  return part_helper(manufacturerID, partID)

@rcpart.route('/part/UnknownManufacturer/<siteID>/<partID>')
def unknown_part(siteID, partID):
  return part_helper("UnknownManufacturer/" + siteID, partID)

updatePartCategoriesHelper()
updateBuildSkeletonHelper()
updatePartIndexHelper()
if __name__ == '__main__':
  application.debug = True
  rcbuild.debug = True
  rcpart.debug = True
  from werkzeug.serving import run_simple
  run_simple('127.0.0.1', 5000, application,
             use_reloader=True, use_debugger=True, use_evalex=True)
