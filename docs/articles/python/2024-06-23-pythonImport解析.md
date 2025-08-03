---
layout: post
title: "Python import解析"
date: 2024-06-23
description: "Python import解析"
tag: python
---   
目录

# module与package
模块（module）
模块与包的关系，可以类比文件和目录，模块就是文件。
Python 文档中这样描述，**一个 Python 文件就是一个模块**，Python 的文件名（不带后缀.py）就是模块名。
一个 module 可以包含变量、函数和类，它们是该 module 定义的命名空间的一部分，因此变量的命名问题不是问题，因为两个不同的模块可以有同名的变量、函数和类。

包（package）
模块与包的关系，可以类比文件和目录，包就是目录。
package 里面可以有 module，也可以有子包（sub-package）。一个模块定义一个命名空间，以便变量、函数和类可以在两个不同的模块中具有相同的名称，同样的，一个包对其组成的包和模块做同样的事情，可以通过点号访问主包中的模块和包。

一个基本的 package 可以包含 sub-package、modules、__init__.py(Python 3.3 之后非必需)、setup.py。

# import 
当 import 机制被触发时，Python 首先会去 sys.modules 中查找该模块是否已经被引入过，如果该模块已经被引入了，就直接调用它，否则再进行下一步。这里 sys.modules 可以看做是一个缓存容器。值得注意的是，如果 sys.modules 中对应的值是 None 那么就会抛出一个 ModuleNotFoundError 异常。

```python
import sys
print(sys.path)
```
这样子就会显示我的相关路径：

```python
['/home/jacin/StudyDemo/django_demo/test_demo', '/home/jacin/StudyDemo/django_demo', '/home/jacin/program/pycharm-2024.1.1/plugins/python/helpers/pycharm_display', '/usr/lib/python310.zip', '/usr/lib/python3.10', '/usr/lib/python3.10/lib-dynload', '/home/jacin/StudyDemo/django_demo/.venv/lib/python3.10/site-packages', '/home/jacin/program/pycharm-2024.1.1/plugins/python/helpers/pycharm_matplotlib_backend']
```
这是相关路径的介绍与说明：
**项目和脚本路径**：'/home/jacin/StudyDemo/django_demo/test_demo' 和 '/home/jacin/StudyDemo/django_demo' 这些路径是你的项目目录和其中的子目录，Python 将它们包含在搜索路径中，以便你可以导入这些目录下的 Python 文件作为模块。
**PyCharm 和其他 IDE 相关路径**：'/home/jacin/program/pycharm-2024.1.1/plugins/python/helpers/pycharm_display' 和 '/home/jacin/program/pycharm-2024.1.1/plugins/python/helpers/pycharm_matplotlib_backend' 这些路径是 PyCharm IDE 的一部分，用于提供额外的功能，比如图形显示和调试支持。
**标准库路径和动态加载库**：'/usr/lib/python310.zip', '/usr/lib/python3.10', 和 '/usr/lib/python3.10/lib-dynload' 这些是 Python 标准库的位置。Python 标准库包含许多预先编写的模块，这些模块提供了从文件 I/O 到网络通信等广泛的功能。

其中 '/usr/lib/python310.zip' 是一个包含**预编译的库的压缩文件**。Python 可以直接从 ZIP 文件中加载模块，这是一种空间和性能优化的方式。将标准库中不常修改的部分压缩成 ZIP 文件，可以减少磁盘占用，并可能提高加载这些库的速度。

**虚拟环境路径**：'/home/jacin/StudyDemo/django_demo/.venv/lib/python3.10/site-packages' 是一个虚拟环境中的 site-packages 目录，这是安装第三方包的地方。使用虚拟环境可以为每个项目创建隔离的 Python 运行环境，避免不同项目之间的依赖冲突。

如果没有发现任何缓存，那么系统将进行一个全新的 import 过程。在这个过程中 Python 将遍历 **sys.meta_path** 来寻找是否有符合条件的元路径查找器（meta path finder）。sys.meta_path 是一个存放元路径查找器的列表。它有三个默认的查找器：

内置模块查找器
冻结模块（frozen module）查找器
基于路径的模块查找器。


# 相对路径与绝对路径
通过绝对路径引用模块，容易造成在后续改变代码结构，或者文件改名时，修改工作多的问题。而相对路径没有这个问题。
绝对路径引用，因为它们从项目根目录下的包开始导入。
使用 python -m 命令加上模块的完整路径来运行,把xxx.py文件当做模块启动.

直接启动是把run.py文件，所在的目录放到了sys.path属性中。
模块启动是把你输入命令的目录（也就是当前路径），放到了sys.path属性中***

```python

# 直接启动：python run.py
test_import_project git:(master) ✗ python run.py
['/Users/sx/Documents/note/test_py/test_import_project',  
 '/usr/local/Cellar/python/2.7.11/Frameworks/Python.framework/Versions/2.7/lib/python27.zip',  
  ...]
# 以模块方式启动：python -m run.py
test_import_project git:(master) ✗ python -m run.py
['',  
 '/usr/local/Cellar/python/2.7.11/Frameworks/Python.framework/Versions/2.7/lib/python27.zip',

```
绝对导入的格式为 import A.B 或 from A import B，相对导入格式为 from . import B 或 from ..A import B，.代表当前模块，..代表上层模块，...代表上上层模块，依次类推。

相对导入可以避免硬编码带来的维护问题，例如我们改了某一顶层包的名，那么其子包所有的导入就都不能用了。

# requiremets.txt

```python
pip install requests
```
在你的虚拟环境的 site-packages 目录中，会看到如下内容：
requests/ —— 包含 .py 文件的目录。
requests-2.25.1.dist-info/ —— 包含元数据和其他分发信息的目录。
结论
通过 pip install 安装的不仅仅是文件夹或 .py 文件，还可能包括编译的扩展、数据文件、元数据、配置文件以及可执行脚本。这些文件和目录共同构成了完整的 Python 包，使得包不仅可以包含可执行代码，还可以携带运行所需的所有资源和信息。
输出： 这就是安装

```python
pip freeze > requirements.txt

```

在常见的Python代码规范中，我们在代码开头导包时，建议按照**标准库>第三方库>自定义库或相对引用库**的顺序组织代码，且各类型导包逻辑中建议按照字母顺序进行排列。

```python
pip install usort
# usort format main.py
（对main.py 进行格式化导包）
```

在之前使用freeze 进行安装的时候，会把所有虚拟环境进行打包，但是很多时候用不到，这里就可以使用pipreqs。pipreqs 通过扫描项目代码，确定哪些第三方库被导入使用，并生成一个包含这些库的最小化依赖列表。

```python
pip install pipreqs

```

```python
 pipreqs ./ --encoding=utf-8
```
