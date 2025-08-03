ElasticSearch的安装说明、介绍与简单使用。
# 安装说明

拉取镜像：

```python
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.0.0
```

启动es:

```python
docker stop elasticsearch
docker rm elasticsearch

*docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.0.0*
  
  # 9200 ElasticSearch 的 HTTP 接口，默认通过该端口访问 REST API。
  # 9300 端口，这是节点间通信的端口
  # single-node : 设置 ElasticSearch 以单节点模式运行，避免集群配置问题（适合开发环境）。
```

检查是否启动：

```python
curl -X GET "http://localhost:9200"
```

安装 Kibana

Kibana 是 ElasticSearch 的可视化工具，你可以使用它来通过图形界面管理和展示数据。

```python
docker pull docker.elastic.co/kibana/kibana:8.0.0
docker run -d \
  --name kibana \
  -p 5601:5601 \
  --link elasticsearch:elasticsearch \
  docker.elastic.co/kibana/kibana:8.0.0
```

可视化地址： 

```python
http://localhost:5601
```

# 介绍与说明

Elasticsearch 与传统的关系型数据库不同，它并不使用“数据库”和“表”的概念。相反，Elasticsearch 使用“**索引**”（index）来存储数据，索引相当于数据库中的“表”。而“**文档**”（document）则相当于表中的一行数据。

Elasticsearch是NOSQL类型的数据库。

索引（index）类似mysql的表，代表文档数据的集合，文档指的是ES中存储的一条数据。

| Elasticsearch存储结构 | MYSQL存储结构 |
| --- | --- |
| index(索引) | 表 |
| 文档 | 行，一行数据 |
| Field(字段） | 表字段 |
| mapping (映射) | 表结构定义 |

> 应用场景
> 
> - 各种搜索场景，例如：订单搜索、商品搜索。
> - 日志处理和分析，例如：通过ELK搭建日志处理和分析方案。
> - 地理空间数据搜索，例如：查询距离最近的店铺、查询某个空间范围内的店铺。

> 多客户端支持
> 
> 
> 因为Elasticsearch支持RESTful风格的Api, 协议使用的是JSON，所以我们可以直接通过http api操作Elasticsearch，除了直接通过http api操作ES，Elasticsearch还支持下面各种开发语言封装的客户端：
> 
> - curl
> - c#
> - go
> - php
> - java
> - python
> - ruby
> - sql

## 文档**Document**

Elasticsearch是面向文档的数据库，文档是最基本的存储单元，文档类似mysql表中的一行数据。

*简单的说在ES中，文档指的就是一条JSON数据。*

Elasticsearch中文档使用**json格式**存储，因此存储上比Mysql要灵活的多，Elasticsearch支持任意格式的json数据。

一个订单数据，我们可以将复杂的Json结构保存到Elasticsearch中.

```python
{
	"id": 12,
	"status": 1,
	"total_price": 100,
	"create_time": "2019-12-12 12:20:22",
	"user" : { // 嵌套json对象
		"id" : 11,
		"username": "tizi365",
		"phone": "13500001111",
		"address" : "上海长宁区001号"
	}
}
```

**文档中的任何json字段都可以作为查询条件。**

**文档的json格式没有严格限制，可以随意增加、减少字段，甚至每一个文档的格式都不一样也可以。**

在同一个索引存中，存储格式完全不一样的文档数据.

```python
{"id":1, "username":"tizi365"}
{"id":1, "title":"好看的包包", "price": 30}
{"domain":"www.tizi365.com", "https": true}
```

> 提示：虽然文档的格式没有限制，可以随便存储任意格式数据，但是，实际业务中不会这么干，通常一个索引只会存储格式相同的数据，例如：订单索引，只会保存订单数据，不会保存商品数据，否则你会被自己搞死，自己都不知道里面存的是什么数据。
> 

## **Field(文档字段)**

文档由多个json字段（Field）组成， 这里的字段类似mysql中表的字段。

当然Elasticsearch中字段也有类型的，下面是常用的字段类型:

- 数值类型（包括: long、integer、short、byte、double、float）
- text - 支持全文搜索
- keyword - 不支持全文搜索，例如：email、电话这些数据，作为一个整体进行匹配就可以，不需要分词处理。
- date - 日期类型
- boolean

> 提示：Elasticsearch支持动态映射，我们可以不必预先定义文档的json结构和对应的字段类型，Elasticsearch会自动推断字段的类型。
> 

## **mapping (映射)**

Elasticsearch的mapping (映射)类似mysql中的表结构定义，每个索引都有一个映射规则，我们可以通过定义索引的映射规则，提前定义好文档的json结构和字段类型，如果没有定义索引的映射规则，Elasticsearch会在写入数据的时候，根据我们写入的数据字段推测出对应的字段类型，相当于自动定义索引的映射规则。

> 提示：虽然Elasticsearch的自动映射功能很方便，但是实际业务中，对于关键的字段类型，通常预先定义好，避免Elasticsearch自动生成的字段类型不是你想要的类型，例如: ES默认将字符串类型数据自动定义为text类型，但是关于手机号，我们希望是keyword类型，这个时候就需要通过mapping预先定义号对应的字段类型了。
> 

# 简单使用

在 Elasticsearch 中创建一个索引并添加一个文档，同时对文本进行分词并查询特定词汇，比如 “故事”。

创建索引 books 并定义映射：

```python
curl -X PUT "http://localhost:9200/books" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard"
      },
      "content": {
        "type": "text",
        "analyzer": "standard"
      },
      "price": {
        "type": "integer"
      }
    }
  }
}'

返回内容：
{"acknowledged":true,"shards_acknowledged":true,"index":"books"}%
```

这段代码创建了一个名为 books 的索引，定义了三个字段：

```
•	title：书名，使用标准分词器。
•	content：书的内容描述，使用标准分词器。
•	price：价格，使用整数类型。

```

将你的书籍内容添加到这个索引中:

```python
curl -X POST "http://localhost:9200/books/_doc/" -H 'Content-Type: application/json' -d'
{
  "title": "屁屁侦探动漫故事系列（全6册）",
  "content": "3-6岁蒲蒲兰绘本桥梁书培养孩子专注力观察力幽默感和成就感暑假阅读暑假课外书课外暑假自主阅读暑期假期读物",
  "price": 197
}'

返回内容： 
{"_index":"books","_id":"xT9DdpIBfilSnbzDVstj","_version":1,"result":"created","_shards":{"total":2,"successful":1,"failed":0},"_seq_no":0,"_primary_term":1}

```

要查询包含 “故事” 这个词的文档，使用以下查询命令：

```python
curl -X GET "http://localhost:9200/books/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "title": "屁屁"
    }
  }
}'
```

你想查询 content 字段中包含 “故事” 的文档

```python
curl -X GET "http://localhost:9200/books/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "content": "故事"
    }
  }
}'
```

在 Elasticsearch 中，你可以使用 _analyze API 来查看文本是如何被分词的。这个 API 能显示输入文本在特定分词器（比如标准分词器）下是如何被处理并分词的。

```python
curl -X POST "http://localhost:9200/_analyze" -H 'Content-Type: application/json' -d'
{
  "analyzer": "standard",
  "text": "屁屁侦探动漫故事系列（全6册）3-6岁蒲蒲兰绘本桥梁书培养孩子专注力观察力幽默感和成就感暑假阅读暑假课外书课外暑假自主阅读暑期假期读物"
}'
```

查看已经索引的文档的某个字段是如何被分词的。假设你想查看 books 索引中 content 字段的分词情况，可以通过以下命令实现：

```python
curl -X POST "http://localhost:9200/books/_analyze" -H 'Content-Type: application/json' -d'
{
  "field": "content",
  "text": "屁屁侦探动漫故事系列（全6册）3-6岁蒲蒲兰绘本桥梁书培养孩子专注力观察力幽默感和成就感暑假阅读暑假课外书课外暑假自主阅读暑期假期读物"
}'
```

但是es对中文支持一般，因为只有单个分词性质。

为了更好地处理中文分词，你可以使用 ik 分词器（比如 IK 中文分词器），它能够对中文文本进行更加符合自然语言逻辑的分词。IK 分词器可以把句子按词语而不是单个字符来分词，这样能够更符合实际的中文查询需求。

如果你在使用 Elasticsearch，需要安装 ik 插件来支持中文分词。在使用 Docker 的情况下，你可以通过如下方式安装 IK 分词器：

```python
docker exec -it elasticsearch /bin/bash
/usr/share/elasticsearch/bin/elasticsearch-plugin install https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v8.0.0/elasticsearch-analysis-ik-8.0.0.zip
```

重新启动 Elasticsearch 容器

```python
docker restart elasticsearch
```

查看list:

```python
docker exec -it elasticsearch /usr/share/elasticsearch/bin/elasticsearch-plugin list

输出这个： analysis-ik
```

创建带有 IK 分词器的索引

创建一个索引，并为文本字段指定使用 ik_smart 或 ik_max_word 分词器：

```python
curl -X PUT "http://localhost:9200/my_index" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "content": {
        "type": "text",
        "analyzer": "ik_smart"
      }
    }
  }
}'
```

插入数据：

```python
curl -X POST "http://localhost:9200/my_index/_doc" -H 'Content-Type: application/json' -d'
{
  "content": "屁屁侦探动漫故事系列（全6册）3-6岁蒲蒲兰绘本桥梁书培养孩子专注力观察力幽默感和成就感暑假阅读暑假课外书课外暑假自主阅读暑期假期读物"
}'
```

插入的数据分词： 

```python
curl -X GET "http://localhost:9200/my_index/_analyze" -H 'Content-Type: application/json' -d'
{
  "field": "content",
  "text": "屁屁侦探动漫故事系列（全6册）3-6岁蒲蒲兰绘本桥梁书培养孩子专注力观察力幽默感和成就感暑假阅读暑假课外书课外暑假自主阅读暑期假期读物"
}'
```