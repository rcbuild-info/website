# Init the es indices.

# Holds secrets for the webhook callback for a user's repo.
curl -XPUT 'http://localhost:9200/private/'
echo
curl -XPUT 'http://localhost:9200/builds/'
echo

curl -XPUT 'http://localhost:9200/private/_mapping/githubsecret' -d '{"githubsecret":{"properties":{"secret":{"type":"string"}}}}'
echo
curl -XPUT 'http://localhost:9200/builds/_mapping/buildsnapshot' -d '
{"buildsnapshot":{"properties":{"branch":{"type":"string","index":"not_analyzed"},"build":{"properties":{"config":{"properties":{"arm":{"type":"string","index":"not_analyzed"},"battery":{"type":"string","index":"not_analyzed"},"blackbox":{"type":"string","index":"not_analyzed"},"esc":{"type":"string","index":"not_analyzed"},"fc":{"type":"string","index":"not_analyzed"},"flightcam":{"type":"string","index":"not_analyzed"},"frame":{"type":"string","index":"not_analyzed"},"hqcam":{"type":"string","index":"not_analyzed"},"motor":{"type":"string","index":"not_analyzed"},"osd":{"type":"string","index":"not_analyzed"},"prop":{"type":"string","index":"not_analyzed"},"receiver":{"type":"string","index":"not_analyzed"},"videotx":{"type":"string","index":"not_analyzed"},"voltagereg":{"type":"string","index":"not_analyzed"}}},"version":{"type":"long"}}},"commits":{"type":"string","index":"not_analyzed"},"next_snapshot":{"type":"string","index":"not_analyzed"},"previous_snapshot":{"type":"string","index":"not_analyzed"},"timestamp":{"type":"date","format":"dateOptionalTime"},"user":{"type":"string","index":"not_analyzed"}}}}},"public":{"mappings":{"buildsnapshot":{"properties":{"branch":{"type":"string"},"build":{"properties":{"_links":{"properties":{"git":{"type":"string"},"html":{"type":"string"},"self":{"type":"string"}}},"config":{"properties":{"arm":{"type":"string"},"battery":{"type":"string"},"blackbox":{"type":"string"},"esc":{"type":"string"},"fc":{"type":"string"},"flightcam":{"type":"string"},"frame":{"type":"string"},"hqcam":{"type":"string"},"motor":{"type":"string"},"osd":{"type":"string"},"prop":{"type":"string"},"receiver":{"type":"string"},"videotx":{"type":"string"},"voltagereg":{"type":"string"}}},"content":{"type":"string"},"download_url":{"type":"string"},"encoding":{"type":"string"},"git_url":{"type":"string"},"html_url":{"type":"string"},"name":{"type":"string"},"path":{"type":"string"},"sha":{"type":"string"},"size":{"type":"long"},"state":{"type":"string"},"type":{"type":"string"},"url":{"type":"string"},"version":{"type":"long"}}},"timestamp":{"type":"date","format":"dateOptionalTime"},"user":{"type":"string"}}}}'
echo

# Clone the repos we want to start with from GitHub
git clone https://github.com/rcbuild-info/part-skeleton.git $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/part-skeleton
git clone https://github.com/rcbuild-info/parts.git $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/parts
git clone https://github.com/rcbuild-info/rcbuild.info-builds.git $LOCAL_GITHUB_REPO_DIRECTORY/rcbuild-info/rcbuild.info-builds

# Clone any other users' build repos here you want to start with. Loading will
# work but they won't show up in the build list until you change it and the
# webhook adds it to the elasticsearch backend.

# Install webhooks in the repos.
curl -XPOST 'http://localhost:6178/repos/rcbuild-info/part-skeleton/hooks' -d "
{\"name\": \"web\",
 \"config\":
  {\"url\": \"http://127.0.0.1:5000/update/partCategories\",
   \"content_type\": \"json\",
   \"secret\": \"$GITHUB_PART_HOOK_HMAC\"},
 \"events\": [\"push\"],
 \"active\": true}"
 echo
 # TODO(tannewt): Add a webhook here for build skeleton changes.
curl -XPOST 'http://localhost:6178/repos/rcbuild-info/parts/hooks' -d "
{\"name\": \"web\",
 \"config\":
  {\"url\": \"http://127.0.0.1:5000/update/partIndex\",
   \"content_type\": \"json\",
   \"secret\": \"$GITHUB_PART_HOOK_HMAC\"},
 \"events\": [\"push\"],
 \"active\": true}"
echo
