---
layout: post
title: "django DRF增删改查"
date: 2024-06-23
description: "本文在django所有的增删改查样例使用的DRF框架序列化操作，并非是简单的orm操作。"
tag: django
---   


本文在django所有的增删改查样例使用的DRF框架序列化操作，并非是简单的orm操作。
@[TOC](目录)

# ORM介绍
Django ORM（**Object-Relational Mapping，对象关系映射**）是 Django 框架的一部分，它提供了一种高效的方式来查询和操作数据库，而无需编写原始的 SQL 语句。Django ORM 允许开发者使用 Python 代码来定义数据模型，然后将这些模型映射到数据库表中。这种抽象层帮助开发者用更直观、更符合对象导向思维的方式来处理数据库操作。
Django 自带**数据库迁移**工具，可以自动或半自动地将模型变更转化为数据库迁移脚本，从而更新数据库结构。这极大地简化了数据库的版本控制和迁移过程。

# 数据库设计原则
1.每一个实体，包含一个自增主键。
2.不进行硬删除，使用**软删除**（给每一个实体设置yn字段，yn=True表示存在，yn=False表示不存在，所以对查询实体，每一个都需要加上yn=true的判断）
3.不在数据库层面设置外键，所有外键关联操作全部用代码进行操作。（如果有外键完整性约束，需要应用程序控制外键会导致表与表之间的耦合，update和delete操作都会涉及相关联的表，影响SQL的性能，甚至会造成死锁。高并发情况下容易造成数据库性能，大数据高并发业务场景数据库使用性能优先。）
4.实体与实体之间关系，比如**一对多**的时候，（例如用户表与企业表），只要在用户表中设置company_id，不需要在company_id设置user_id，因为company与user是一对多的关系，（将外键属性放在“多”的一端（用户））；如果是多对多的关系（例如用户表与菜单表），要使用一个**中间表**（有时也称为联结表或关联表）。这个中间表包含了两个主表的主键作为外键。
5.对于价格字段，如果不涉及计算可以使用decimal，否则使用int来避免精度缺失。
6.**不使用存储过程、视图、触发器、Event**。高并发大数据的互联网业务，架构设计思想是“解放数据库CPU，将计算转移到服务层”，并发量大的情况下，这些功能会将数据库拖死，业务逻辑放在服务层具备更好的拓展性，能够轻易实现“增机器就加性能”。数据库擅长存储与索引。
7.对不同的系统的数据库设置不同的用户名-数据库名-密码（以此保证安全性）其他的用户进行访问，设置ip白名单对数据库访问进行设置。
8.必须使用varchar（20）存储手机号。（涉及到区号或者国家的代号，varchar可以支持模糊查询）

数据库三大范式：
为了建立冗余较小、结构合理的数据库，设计数据库时必须遵循一定的规则。在**关系型数据库**中这种规则就称为范式。范式是符合某一种设计要求的总结。要想设计一个结构合理的关系型数据库，必须满足一定的范式。

第一范式(确保每列保持原子性)：
第一范式是**最基本的范式**。如果数据库表中的所有字段值都是不可分解的原子值，就说明该数据库表满足了第一范式。
第一范式的合理遵循需要根据系统的实际需求来定。比如某些数据库系统中需要用到“地址”这个属性，本来直接将“地址”属性设计成一个数据库表的字段就行。但是如果系统经常会访问“地址”属性中的“城市”部分，那么就非要将“地址”这个属性重新拆分为省份、城市、详细地址等多个部分进行存储，这样在对地址中某一部分操作的时候将非常方便。这样设计才算满足了数据库的第一范式，如下表所示。

第二范式(确保表中的每列都和主键相关)
第二范式在第一范式的基础之上更进一层。第二范式需要确保数据库表中的每一列都和主键相关，而不能只与主键的某一部分相关（主要针对联合主键而言）。也就是说在一个数据库表中，一个表中只能保存一种数据，不可以把多种数据保存在同一张数据库表中。

第三范式(**确保每列都和主键列直接相关**,而不是间接相关)
第三范式需要确保数据表中的每一列数据都和主键直接相关，而不能间接相关。

# DRF增删改操作
这里以一个商品product model 序列化为例：

```python
class ProductSerializer(serializers.ModelSerializer):
    create_time = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    update_time = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'category_id', 'product_code', 'product_name', 'brand_name', 'image_url_list',
            'product_material', 'product_features', 'supple_price', 'retail_price', 'commission',
            'remark', 'field_json', 'score', 'score_details', 'company_id', 'is_featured', 'stock',
            'status', 'create_time', 'update_time', 'yn'
        ]
        read_only_fields = ('create_time', 'update_time')
```

同时这里使用DRF 框架进行orm操作，将实体的属性抽成一个serializers 进行序列化操作，方便更好地进行统一管理。
 添加，后端拿到data后，直接放一个 ProductSerializer(data=data) 完成操作，注意需要和前端商定相关字段，尽量确保前后端接口的JSON字段一致，这样后端就不用再进行处理了。
```python
        data = request.data.copy()
        data['company_id'] = user_expand.company_id
        # 解析请求数据,将company_id加入
        serializer = ProductSerializer(data=data)
        print(serializer)

        if serializer.is_valid():
            # 保存新产品
            serializer.save()
            return build_success_response()
        else:
            logger.info(f"ProductAddView: {serializer.errors}")
            raise BusinessException.build_by_dict(status_data.PARAM_ERROR_40001)
            
def build_success_response(data=None):
    r_data = OK_200.copy()
    if data is not None:
        r_data["data"] = data
    return Response(r_data, status=status.HTTP_200_OK)
```
获取单个的商品详情：

```python
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            raise BusinessException.build_by_dict(status_data.OBJECT_NOT_EXIST_40003)

        serializer = ProductSerializer(product)
        return build_success_response(serializer.data)
```
更新单个商品信息：

```python
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            raise BusinessException.build_by_dict(status_data.OBJECT_NOT_EXIST_40003)

        # Update data from request
        serializer = ProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return build_success_response()
        else:
            logger.info(f"ProductAddView: {serializer.errors}")
            raise BusinessException.build_by_dict(status_data.PARAM_ERROR_40001)
```
ProductSerializer: 这是一个 Django REST Framework 的序列化器类，通常用于将模型实例（如 Django 模型）转换成 JSON 格式，或者将 JSON 数据解析回 Django 模型。
product: 这是一个 Django 模型的实例，表示一个特定的产品。这个实例作为第一个参数传递给 ProductSerializer，意味着序列化器将基于这个现有的模型实例进行操作。
data=request.data: 这是**序列化器的第二个参数**，通常包含了要**更新或创建模型实例时的新数据**。request.data 来自 DRF 的请求对象，包含了客户端提交的 JSON 或表单数据。
partial=True: 这个关键字参数告诉序列化器这是**一个部分更新**。在默认情况下，序列化器在更新模型时期望接收所有必需字段的数据。将 **partial 设置为 True 允许更新操作仅包括提供的字段，而不需要完整的字段集合**。这对于实现 PATCH HTTP 方法非常有用，其中只需提供需要更改的字段。

删除（注意是软删除）（或者更新一个字段，直接使用这个update较为方便）：

```python
        products_to_delete = Product.objects.filter(id__in=product_ids)
        if not products_to_delete.exists():
            raise BusinessException.build_by_dict(status_data.OBJECT_NOT_EXIST_40003)

        # 执行软删除操作，将 'yn' 设置为 False
        products_to_delete.update(yn=False)
        return build_success_response()
```

# 高级查询
在这里查询单独做一个模块，因为这里的查询较为复杂，一般来说涉及到如下：1.查询所有的商品列表。 2.基于某个关键词进行模糊查询 3.分页查询。（一般我直接统一归化为一个函数）
这里使用分页查询+Q查询来统一处理。
一般做查询操作都会涉及分页查询，当前端传入参数：

```python
page_size = int(request.data.get('page_size', 10))
page_number = int(request.data.get('page_number', 1))
```
分页查询是一种常用的技术，用于将大量数据分批次展示给用户，从而提高响应速度，减少数据传输量，并提升用户体验。分页查询常见于列表显示，例如用户列表、产品目录等，特别是当数据量较大时，一次性加载全部数据是不现实的。
page_size（页面大小）:这个参数定义了**每页显示的记录数。**page_size 是通过请求数据获取的，如果没有提供，默认为 10。这意味着每页将显示 10 条记录。
page_number（页码）:这个参数指定了用户想要访问的页数。在你的示例中，page_number 也是通过请求数据获取的，如果没有提供，默认为第 1 页。这告诉服务器用户想要获取第一个数据批次。
在 **SQL 中实现分页查询**，你可以使用 **LIMIT** 和 **OFFSET** 子句。这些子句允许你限制 SQL 查询返回的结果数量（LIMIT），并指定从哪条记录开始返回（OFFSET）。使用这两个子句结合起来，就可以实现分页功能。

```sql
-- 假设传入的参数是 page_size = 10 和 page_number = 1

SELECT *
FROM Products
LIMIT 10 OFFSET 0;  -- 对于第1页，OFFSET 是 0
转为代码：
products = Product.objects.filter(query).order_by('-create_time')[offset:offset + page_size]
```
关系式子 :   OFFSET=(page_number−1)×page_size 。
在DRF使用分页，使用自带：

```python
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import MyModel
from .serializers import MyModelSerializer

class ListMyModel(APIView):
    def get(self, request):
        # 获取分页参数
        page_size = int(request.query_params.get('page_size', 10))
        page_number = int(request.query_params.get('page_number', 1))

        # 查询数据
        queryset = MyModel.objects.all()

        # 应用分页
        paginator = PageNumberPagination()
        paginator.page_size = page_size
        result_page = paginator.paginate_queryset(queryset, request)
        serializer = MyModelSerializer(result_page, many=True, context={'request': request})

        # 返回分页后的结果
        return paginator.get_paginated_response(serializer.data)

```

使用Q复杂查询：
Q 对象提供了一种灵活的方式来构建复杂的查询条件，特别是在需要执行 OR 查询时非常有用。使用 Q 对象，你可以组合使用 AND、OR 和 NOT 条件来构建查询，而不仅限于简单的过滤方法（如 .filter() 和 .exclude()）所提供的功能。
Q 对象可以通过 Django 的 Q 类来使用，这个类定义在 django.db.models 模块中。**一个 Q 对象代表了一个 SQL 表达式**，可以是一个简单的条件，也可以是多个条件的组合。这些条件可以用 &（AND）、|（OR）和 ~（NOT）运算符组合起来。

```python
from django.db.models import Q

# 创建 Q 对象
q1 = Q(name='John')  # WHERE name = 'John'
q2 = Q(age__gt=30)   # AND age > 30
q3 = Q(name='John') | Q(name='Jane')  # OR name = 'Jane'

# 使用 Q 对象构建复杂查询
people = Person.objects.filter(Q(name='John') | Q(age__gt=30))

```
用了 **&=** 操作符，它是 Python 中的一个赋值运算符，用于对原有变量进行位与操作后再赋值。在 Q 对象的上下文中，**&= 用来添加一个新的条件到现有的 Q 对象中**，并且这个新条件与原有条件之间是逻辑 AND 的关系。这意味着结果集必须同时满足这两个条件。
使用Q的时候，字段确定可以直接使用= ,否则就是字段__ (value):下面给出了value的一些类型情况

```python
下面是一些常用的查找类型，可以在 Q 对象中使用：

exact: 精确等于。如果不指定任何查找类型，exact 是默认的查找类型。

例：Q(field_name__exact="value")
iexact: 不区分大小写的精确等于。

例：Q(field_name__iexact="value")
contains: 包含给定的值（区分大小写）。

例：Q(field_name__contains="value")
icontains: 包含给定的值（不区分大小写）。

例：Q(field_name__icontains="value")
in: 字段值在给定的列表中。

例：Q(field_name__in=[list_of_values])
gt, gte, lt, lte: 分别对应大于、大于等于、小于、小于等于。

例：Q(field_name__gt=value)
startswith 和 istartswith: 字段值以某个字符串开始（区分和不区分大小写）。

例：Q(field_name__startswith="value")
例：Q(field_name__istartswith="value")
endswith 和 iendswith: 字段值以某个字符串结束（区分和不区分大小写）。

例：Q(field_name__endswith="value")
例：Q(field_name__iendswith="value")
range: 字段值在两个值之间（包含这两个值）。

例：Q(field_name__range=(start_value, end_value))
```
这里要特别当心的时间的查询：
因为前端传入时间是yy-mm-dd形式，所以要自动+1操作，否则就是默认当天的0点。

```python
        if start_time and end_time:
            start_date = timezone.datetime.strptime(start_time, '%Y-%m-%d')
            end_date = timezone.datetime.strptime(end_time, '%Y-%m-%d') + timezone.timedelta(days=1)
            query &= Q(create_time__range=(start_date, end_date))
```
下面给出了一个详细的列表查询，包括前端可以传的参数等。
```python
class ProductListView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            user_expand = UserExpand.objects.get(user=user)
        except UserExpand.DoesNotExist:
            raise BusinessException.build_by_dict(status_data.OBJECT_NOT_EXIST_40003)

        page_size = int(request.data.get('page_size', 10))
        page_number = int(request.data.get('page_number', 1))

        # Build the query based on user type
        query = Q(yn=True)  # Only active products
        if user_expand.user_maker == user_expand.UserMakerSource.Merchant:  # Merchant
            query &= Q(company_id=user_expand.company_id)
        elif user_expand.user_maker in [user_expand.UserMakerSource.ADMIN,
                                        user_expand.UserMakerSource.Operator]:  # Admin or Operator
            # No additional restrictions for admins/operators
            pass
        else:
            raise BusinessException(status_code.PERMISSION_DENIED_40101, "无权限进行查看")

        # Apply filters from the request
        category_id = request.data.get('category_id')
        product_name = request.data.get('product_name')
        product_status = request.data.get('product_status')
        min_score = request.data.get('min_score')
        max_score = request.data.get('max_score')
        start_time = request.data.get('submit_start_time')
        end_time = request.data.get('submit_end_time')

        if category_id:
            query &= Q(category_id=category_id)
        if product_name:
            query &= Q(product_name__icontains=product_name)
        if product_status:
            query &= Q(status=product_status)
        if min_score:
            query &= Q(score__gte=min_score)
        if max_score:
            query &= Q(score__lte=max_score)
        if start_time and end_time:
            start_date = timezone.datetime.strptime(start_time, '%Y-%m-%d')
            end_date = timezone.datetime.strptime(end_time, '%Y-%m-%d') + timezone.timedelta(days=1)
            query &= Q(create_time__range=(start_date, end_date))
        # django自带分页
        # products = Product.objects.filter(query).order_by('-create_time')
        # paginator = PageNumberPagination()
        # paginator.page_size = page_size
        # result_page = paginator.paginate_queryset(products, request)
        # serializer = ProductSerializer(result_page, many=True)

        # Append category names to the data
        # 使用Q 来进行分页查询
        offset = (page_number - 1) * page_size
        products = Product.objects.filter(query).order_by('-create_time')[offset:offset + page_size]
        serializer = ProductSerializer(products, many=True)
        # 由于我们处理的是多个对象，因此必须在初始化序列化器时设置 many=True。
        # 这是因为在默认情况下（即 many=False），序列化器期望单个对象实例，而不是列表。
        category_ids = {product['category_id'] for product in serializer.data}
        categories = Category.objects.filter(id__in=category_ids)
        category_dict = {category.id: category.category_name for category in categories}

        for product_data in serializer.data:
            product_data['category_name'] = category_dict.get(product_data['category_id'], 'Unknown')
        total_items = Product.objects.filter(query).count()
        total_pages = (total_items + page_size - 1) // page_size
        response_data = {
            "status": 200,
            "message": "OK",
            "data": serializer.data,
            "total_items": total_items,# 表示查询出来的所有items
            "total_pages": total_pages,# 表示总共的页数
            "current_page": page_number #现在的页数，前端传过来的page_number
        }

        return Response(response_data)
```

# 原生sql处理
对于一些非常复杂的处理或者一些不得不用sql来处理的操作，django也提供了相应的措施。

1.使用 **raw() 方法**执行原始 SQL 查询 
raw() 方法可以直接在模型上执行原始 SQL 查询并返回模型实例。这适用于需要直接从数据库获取数据的情况。

```python
products = Product.objects.raw(sql)
products = Product.objects.raw(sql, []) #不使用参数请使用[],不要使用None

sql = "SELECT * FROM app_product WHERE price > %s"
price_threshold = 100
products = Product.objects.raw(sql, [price_threshold])
```
注意：返回的类型是实体list，所以需要迭代，这意味着你可以遍历查询结果中的每个对象。

```python
sql = "SELECT * FROM product WHERE price > 100"
products = Product.objects.raw(sql)

for product in products:
    print(product.name, product.price)  # 假设产品模型有 'name' 和 'price' 字段

```
raw() 方法返回的对象支持部分 QuerySet 操作，如 count() 和 iterator()，但不支持 filter()、exclude() 等，因为这些需要 Django 的查询构建器来构造进一步的 SQL 语句。


2 使用 Django 的cursor()来执行一系列 SQL 命令
对于需要执行多条 SQL 语句的场景，比如在一个事务中执行多个插入或更新操作。
但通常这些都是在数据库游标的上下文中执行，并且主要用于**执行不返回行的 SQL 命令**（如 INSERT、UPDATE、DELETE 等）。


```python
from django.db import connection
from myapp.models import Product

def get_products_by_raw_sql():
    # 手动编写的 SQL 查询
    sql = "SELECT id, name, price FROM myapp_product WHERE price > 100"

    with connection.cursor() as cursor:
    # 使用 connection.cursor() 来获取一个游标对象，通过这个对象执行 SQL 命令。
        cursor.execute(sql)
    # cursor.execute(sql) 执行 SQL 查询。
        # 获取查询结果的所有行
        rows = cursor.fetchall()

    # 将结果行转换为 Product 模型实例列表
    products = []
    for row in rows:
        product = Product(id=row[0], name=row[1], price=row[2])
        products.append(product)

    return products

```
