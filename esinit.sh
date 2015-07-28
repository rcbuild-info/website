sudo apt-get update
sudo apt-get install openjdk-7-jre-headless --yes
sudo apt-get install unzip --yes
wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.7.0.zip
unzip elasticsearch-*.zip
cd elasticsearch-*/
bin/plugin install elasticsearch/elasticsearch-cloud-aws/2.7.0
echo '
cloud:
   aws:
       access_key: $ES_ACCESS_KEY
       secret_key: $ES_SECRET_KEY
       region: us-west-2
cluster.name: rcbuildinfo
discovery:
   type: ec2
discovery.ec2.groups: es_cluster
' > config/elasticsearch.yml
export ES_HEAP_SIZE=512m
./bin/elasticsearch -d
