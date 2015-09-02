# Init the es indices.

# Holds secrets for the webhook callback for a user's repo.
curl -XPUT 'http://localhost:9200/private/'
echo
curl -XPUT 'http://localhost:9200/builds/'
echo

curl -XPUT 'http://localhost:9200/private/_mapping/githubsecret' -d '{"githubsecret":{"properties":{"secret":{"type":"string"}}}}'
echo
curl -XPUT 'http://localhost:9200/builds/_mapping/buildsnapshot' -d '
{"buildsnapshot":{"properties":{"branch":{"type":"string","index":"not_analyzed"},
                                "build":{"type": "object", "dynamic": false},
                                "commits": { "type": "string","index": "not_analyzed"},
                                "next_snapshot": { "type": "string","index": "not_analyzed"},
                                "previous_snapshot": { "type": "string","index": "not_analyzed"},
                                "timestamp":{"type":"date","format":"dateOptionalTime"},
                                "user":{"type":"string"}}}}'
echo

# Clone the repos we want to start with from GitHub
git clone https://github.com/rcbuild-info/part-skeleton.git $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/part-skeleton
git clone https://github.com/rcbuild-info/parts.git $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/parts
git clone https://github.com/rcbuild-info/rcbuild.info-builds.git $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/rcbuild.info-builds

# Add hooks so that local-github is called back.
# TODO(tannewt): Should local-github handle cloning and this for us?
echo "curl \"http://localhost:6178/hook/post-commit?sha=\`git log -1 --format=format:%H\`&user=rcbuild-info&repo=part-skeleton\"" > $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/part-skeleton/.git/hooks/post-commit
chmod +x $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/part-skeleton/.git/hooks/post-commit
echo "curl \"http://localhost:6178/hook/post-commit?sha=\`git log -1 --format=format:%H\`&user=rcbuild-info&repo=parts\"" > $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/parts/.git/hooks/post-commit
chmod +x $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/parts/.git/hooks/post-commit
echo "curl \"http://localhost:6178/hook/post-commit?sha=\`git log -1 --format=format:%H\`&user=rcbuild-info&repo=rcbuild.info-builds\"" > $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/rcbuild.info-builds/.git/hooks/post-commit
chmod +x $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/rcbuild.info-builds/.git/hooks/post-commit

# Clone any other users' build repos here you want to start with. Loading will
# work but they won't show up in the build list until you change it and the
# webhook adds it to the elasticsearch backend.

# Install webhooks in the repos.
curl -XPOST -H "Content-Type: application/json" 'http://localhost:6178/repos/rcbuild-info/part-skeleton/hooks' -d "
{\"name\": \"web\",
 \"config\":
  {\"url\": \"http://127.0.0.1:5000/update/partCategories\",
   \"content_type\": \"json\",
   \"secret\": \"$GITHUB_PART_HOOK_HMAC\"},
 \"events\": [\"push\"],
 \"active\": true}"
 echo
curl -XPOST -H "Content-Type: application/json" 'http://localhost:6178/repos/rcbuild-info/rcbuild.info-builds/hooks' -d "
{\"name\": \"web\",
 \"config\":
  {\"url\": \"http://127.0.0.1:5000/update/buildSkeleton\",
   \"content_type\": \"json\",
   \"secret\": \"$GITHUB_PART_HOOK_HMAC\"},
 \"events\": [\"push\"],
 \"active\": true}"
echo
curl -XPOST -H "Content-Type: application/json" 'http://localhost:6178/repos/rcbuild-info/parts/hooks' -d "
{\"name\": \"web\",
 \"config\":
  {\"url\": \"http://127.0.0.1:5000/update/partIndex\",
   \"content_type\": \"json\",
   \"secret\": \"$GITHUB_PART_HOOK_HMAC\"},
 \"events\": [\"push\"],
 \"active\": true}"
echo
