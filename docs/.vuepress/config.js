module.exports = {
  title: "Jacin   ME",
  description: "AI 开发",
  keywords: "后端开发",
  head: [
    [
      "link",
      {
        rel: "icon",
        href: "https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250803191554812.jpeg",
      },
    ],

  ],
  base: "/",
  serviceWorker: true,
  markdown: {
    extendMarkdown: md => {
      // 1. 标题打锚点
      md.use(require('markdown-it-anchor'), { permalink: false });
      // 2. 新的 TOC 插件，忽略容器深度，直接收集 1–3 级标题
      md.use(require('markdown-it-toc-done-right'), {
        // 收集哪几级标题
        level: [1, 2, 3,4,5],
        // 插入点标记，保持 [[toc]]
        placeholder: '[[toc]]',
        // 可选：渲染成 ul 还是 ol
        listType: 'ul',
      });
    },
  },
  themeConfig: {
    sidebar: 'auto',
    sidebarDepth: 3,
    lastUpdatedText: "上次更新",
    navbar: [
      {
        text: "主页",
        link: "/",
      },
      {
        text: "技术文章",
        link: "/articles/",
      },
      {
        text: "AI",
        link: "/AI/",
      },
      {
        text: "关于",
        link: "/about/",
      },
      {
        text: "Github",
        link: "https://github.com/jacinli",
      },
      {
        text: "社区链接",
        children: [
          {
            text: "CSDN",
            link: "https://blog.csdn.net/QAZJOU",
          }
          
        ],
      },
    ],
    sidebar: {
      "/AI/": [
        {
          "text":"前沿技术",
          "link": "/AI/前沿技术/",
          "children": [
            {
              "text":"FastAPI-MCP",
              "link": "/AI/前沿技术/FastAPI-MCP.md"
            },
            {
              "text":"langfuse追踪Trace",
              "link": "/AI/前沿技术/langfuse追踪Trace.md"
            },
            {
              "text":"多agent框架Autogen参数说明.md",
              "link": "/AI/前沿技术/多agent框架Autogen参数说明.md"
            }
          ]
        },
        {
          "text": "OpenAI",
          "link": "/AI/openai/",
          "children": [
            {
              "text":"GPT-5最强模型?",
              "link": "/AI/openai/GPT-5最强模型.md"
            },
            {
              "text": "202508-GPT模型选择与降智测试",
              "link": "/AI/openai/202508-GPT模型选择与降智测试.md"
            },
            {
              "text":"openai工具调用",
              "link": "/AI/openai/openai工具调用.md"
            },
            {
              "text":"openai流式解析",
              "link": "/AI/openai/openai流式解析.md"
            }
          ]
        }
      ],
      "/articles/": [
        {
          "text":"vps",
          "link": "/articles/vps/",
          "children": [
            {
              "text":"哪吒面板安装与使用",
              "link": "/articles/vps/哪吒面板安装与使用.md"
            },
            {
              "text":"ICMP与TCPping整理",
              "link": "/articles/vps/ICMP与TCPping整理.md"
            }
          ]
        },
        {
          "text": "网络",
          "link": "/articles/网络/",
          "children": [
            {
              "text":"DNS中的ECS",
              "link": "/articles/网络/DNS中的ECS.md"
            },
            {
              "text":"BBR网络介绍与使用",
              "link": "/articles/网络/bbr算法介绍.md"
            },
            {
              "text":"双ISP",
              "link": "/articles/网络/双ISP.md"
            },
            {
              "text":"cloudflare证书",
              "link": "/articles/网络/cloudflare证书.md"
            },
            {
              "text": "网络https协议",
              "link": "/articles/网络/2025-01-09-网络https协议.md"
            },
            {
              "text": "SSL证书与CA证书",
              "link": "/articles/网络/2025-01-10-SSL证书与CA证书.md"
            },
            {
              "text": "5G-A技术",
              "link": "/articles/网络/2025-03-05-5G-A技术.md"
            },
            {
              "text": "CORS与OPTIONS请求",
              "link": "/articles/网络/2025-03-10-CORS与OPTIONS请求.md"
            },
            {
              "text": "跨站请求",
              "link": "/articles/网络/2025-03-20-跨站请求.md"
            },
            {
              "text": "点击劫持",
              "link": "/articles/网络/2025-03-21-点击劫持.md"
            },
            {
              "text": "cdn 是什么？",
              "link": "/articles/网络/2025-04-23-cdn 是什么？.md"
            },
            {
              "text": "\"阿里云差点被‘劫持’？你必须懂的 DNS 知识",
              "link": "/articles/网络/2025-06-08-\"阿里云差点被‘劫持’？你必须懂的 DNS 知识.md"
            },
            {
              "text": "gRPC 相关介绍",
              "link": "/articles/网络/2025-06-10-gRPC 相关介绍.md"
            },
            {
              "text": "gRPC 使用",
              "link": "/articles/网络/2025-06-11-gRPC 使用.md"
            },
            {
              "text": "精品网络解析",
              "link": "/articles/网络/2025-06-20-精品网络解析.md"
            },
            {
              "text": "README",
              "link": "/articles/网络/README.md"
            }
          ]
        },
        {
          "text": "Git",
          "link": "/articles/Git/",
          "children": [
            {
              "text": "Git删除敏感密钥",
              "link": "/articles/Git/2025-02-09-Git删除敏感密钥.md"
            },
            {
              "text": "Github开源协议",
              "link": "/articles/Git/2025-02-10-Github开源协议.md"
            },
            {
              "text": ".gitattributes与git-lfs",
              "link": "/articles/Git/2025-02-11-.gitattributes与git-lfs.md"
            },
            {
              "text": ".git文件夹解析",
              "link": "/articles/Git/2025-02-12-.git文件夹解析.md"
            },
            {
              "text": "gitflow 分支模型",
              "link": "/articles/Git/2025-04-04-gitflow 分支模型.md"
            }
          ]
        },
        {
          "text": "Linux",
          "link": "/articles/Linux/",
          "children": [
            {
              "text": "Nginx反向代理",
              "link": "/articles/Linux/2024-06-28-Nginx反向代理.md"
            }
          ]
        },
        {
          "text": "go",
          "link": "/articles/go/",
          "children": [
            {
              "text": "go 环境搭建",
              "link": "/articles/go/2025-05-23-go 环境搭建.md"
            },
            {
              "text": "gin框架",
              "link": "/articles/go/2025-05-24-gin框架.md"
            },
            {
              "text": "gin 常见中间件配置",
              "link": "/articles/go/2025-05-25-gin 常见中间件配置.md"
            },
            {
              "text": "docker部署 gin",
              "link": "/articles/go/2025-05-26-docker部署 gin.md"
            },
            {
              "text": "gorm配置数据库",
              "link": "/articles/go/2025-05-31-gorm配置数据库.md"
            },
            {
              "text": "go 里面的指针",
              "link": "/articles/go/2025-06-01-go 里面的指针.md"
            },
            {
              "text": "go channel用法",
              "link": "/articles/go/2025-06-03-go channel用法.md"
            },
            {
              "text": "README",
              "link": "/articles/go/README.md"
            }
          ]
        },
        {
          "text": "python",
          "link": "/articles/python/",
          "children": [
            {
              "text": "pythonImport解析",
              "link": "/articles/python/2024-06-23-pythonImport解析.md"
            },
            {
              "text": "FastApi+WebSocket解析",
              "link": "/articles/python/2024-07-07-FastApi+WebSocket解析.md"
            },
            {
              "text": "SSE流式fastapi",
              "link": "/articles/python/2025-01-02-SSE流式fastapi.md"
            },
            {
              "text": "uv包管理",
              "link": "/articles/python/2025-01-03-uv包管理.md"
            },
            {
              "text": "sqladmin管理工具",
              "link": "/articles/python/2025-01-04-sqladmin管理工具.md"
            },
            {
              "text": "协程调度",
              "link": "/articles/python/2025-01-05-协程调度.md"
            },
            {
              "text": "工厂基类",
              "link": "/articles/python/2025-01-14-工厂基类.md"
            },
            {
              "text": "pytest测试代码专用",
              "link": "/articles/python/2025-01-26-pytest测试代码专用.md"
            },
            {
              "text": "python-格式化利器",
              "link": "/articles/python/2025-01-29-python-格式化利器.md"
            },
            {
              "text": "docker使用uv安装依赖",
              "link": "/articles/python/2025-02-01-docker使用uv安装依赖.md"
            },
            {
              "text": "定时任务(python)",
              "link": "/articles/python/2025-03-02-定时任务(python).md"
            },
            {
              "text": "APScheduler解析",
              "link": "/articles/python/2025-03-03-APScheduler解析.md"
            },
            {
              "text": "装饰器使用",
              "link": "/articles/python/2025-03-15-装饰器使用.md"
            },
            {
              "text": "Macbook配置开发环境",
              "link": "/articles/python/2025-03-24-Macbook配置开发环境.md"
            },
            {
              "text": "python 搜索模块解析",
              "link": "/articles/python/2025-04-28-python 搜索模块解析.md"
            },
            {
              "text": "从 Alpha 到 Final：Python 各阶段版本到底该怎么用？",
              "link": "/articles/python/2025-06-12-从 Alpha 到 Final：Python 各阶段版本到底该怎么用？.md"
            },
            {
              "text": "asyncio 与 uvloop",
              "link": "/articles/python/2025-06-22-asyncio 与 uvloop.md"
            },
            {
              "text": "README",
              "link": "/articles/python/README.md"
            }
          ]
        },
        {
          "text": "spider",
          "link": "/articles/spider/",
          "children": [
            {
              "text": "AES算法与接口解密",
              "link": "/articles/spider/2024-09-08-AES算法与接口解密.md"
            }
          ]
        },
        {
          "text": "工具使用",
          "link": "/articles/工具使用/",
          "children": [
            {
              "text": "picgo配置",
              "link": "/articles/工具使用/2025-01-11-picgo配置.md"
            },
            {
              "text": "cloudfare配置内网穿透",
              "link": "/articles/工具使用/2025-01-12-cloudfare配置内网穿透.md"
            },
            {
              "text": "cloudfare+gmail 配置 smtp 邮箱",
              "link": "/articles/工具使用/2025-04-16-cloudfare+gmail 配置 smtp 邮箱.md"
            },
            {
              "text": "邮件协议、签名与推送",
              "link": "/articles/工具使用/2025-04-17-邮件协议、签名与推送.md"
            },
            {
              "text": "什么是Rosetta",
              "link": "/articles/工具使用/2025-05-02-什么是Rosetta.md"
            },
            {
              "text": "README",
              "link": "/articles/工具使用/README.md"
            }
          ]
        },
        {
          "text": "接口设计",
          "link": "/articles/接口设计/",
          "children": [
            {
              "text": "接口等幂处理",
              "link": "/articles/接口设计/2025-02-26-接口等幂处理.md"
            },
            {
              "text": "catch-all路由",
              "link": "/articles/接口设计/2025-03-07-catch-all路由.md"
            }
          ]
        },
        {
          "text": "数据库",
          "link": "/articles/数据库/",
          "children": [
            {
              "text": "Alembic使用",
              "link": "/articles/数据库/2024-09-30-Alembic使用.md"
            },
            {
              "text": "Redis简单的消息队列",
              "link": "/articles/数据库/2024-09-30-Redis简单的消息队列.md"
            },
            {
              "text": "elasticsearch简单使用",
              "link": "/articles/数据库/2024-10-11-elasticsearch简单使用.md"
            },
            {
              "text": "主键id设计",
              "link": "/articles/数据库/2025-02-17-主键id设计.md"
            },
            {
              "text": "数据库预热",
              "link": "/articles/数据库/2025-03-16-数据库预热.md"
            },
            {
              "text": "mysql中的锁",
              "link": "/articles/数据库/2025-05-12-mysql中的锁.md"
            },
            {
              "text": "乐观锁和悲观锁",
              "link": "/articles/数据库/2025-05-14-乐观锁和悲观锁.md"
            },
            {
              "text": "mysql错误码 2013 解决方案",
              "link": "/articles/数据库/2025-05-26-mysql错误码 2013 解决方案.md"
            },
            {
              "text": "README",
              "link": "/articles/数据库/README.md"
            }
          ]
        },
        {
          "text": "消息队列",
          "link": "/articles/消息队列/",
          "children": [
            {
              "text": "rocketmq 配置环境[python]",
              "link": "/articles/消息队列/2025-05-01-rocketmq 配置环境[python].md"
            }
          ]
        },
        {
          "text": "编程场景设计",
          "link": "/articles/编程场景设计/",
          "children": [
            {
              "text": "手机号登录与高并发思考",
              "link": "/articles/编程场景设计/2025-01-06-手机号登录与高并发思考.md"
            },
            {
              "text": "微信小程序登录",
              "link": "/articles/编程场景设计/2025-01-07-微信小程序登录.md"
            },
            {
              "text": "扫码登录",
              "link": "/articles/编程场景设计/2025-01-08-扫码登录.md"
            },
            {
              "text": "多角色多端状态控制与锁控制",
              "link": "/articles/编程场景设计/2025-05-15-多角色多端状态控制与锁控制.md"
            },
            {
              "text": "多房间 WebSocket 连接管理设计：从单例模式到多终端连接池",
              "link": "/articles/编程场景设计/2025-06-27-多房间 WebSocket 连接管理设计：从单例模式到多终端连接池.md"
            }
          ]
        },
        
        {
          "text": "计算机知识",
          "link": "/articles/计算机知识/",
          "children": [
            {
              "text": "腾讯云COS解析",
              "link": "/articles/计算机知识/2024-07-21-腾讯云COS解析.md"
            }
          ]
        },
        {
          "text": "设计模式",
          "link": "/articles/设计模式/",
          "children": [
            {
              "text": "单例模式",
              "link": "/articles/设计模式/2025-03-01-单例模式.md"
            }
          ]
        },
        {
          "text": "音视频",
          "link": "/articles/音视频/",
          "children": [
            {
              "text": "rtmp协议解析 1",
              "link": "/articles/音视频/2025-04-07-rtmp协议解析 1.md"
            }
          ]
        }
      ]
    }
  },
};
