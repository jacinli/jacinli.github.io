module.exports = {
  title: "Jacin的博客",
  description: "AI 开发",
  keywords: "后端开发",
  head: [
    [
      "link",
      {
        rel: "icon",
        href: "/img/logo.ico",
      },
    ],
    [
      "script",
      {},
      `var _hmt = _hmt || [];
      (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?3cd236a05c52c534bbcc794ec45f52a3";
        var s = document.getElementsByTagName("script")[0]; 
        s.parentNode.insertBefore(hm, s);
      })();`,
    ],
  ],
  base: "/",
  serviceWorker: true,
  themeConfig: {
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
      "/articles/": [
        {
          text: "AI技术博客",
          link: "/articles/AI/",
          children: [{
            text: "Autogen参数说明",
            link: "/articles/AI/2025-03-28-Autogen参数说明.md",
          }],
        },
        {
          text: "Python开发",
          link: "/articles/python/",
        },
        {
          text: "Go开发",
          link: "/articles/go/",
        },
        {
          text: "网络技术",
          link: "/articles/网络/",
        },
        {
          text: "数据库",
          link: "/articles/数据库/",
        },
        {
          text: "工具使用",
          link: "/articles/工具使用/",
        },
        {
          text: "Git",
          link: "/articles/Git/",
        },
        {
          text: "Linux",
          link: "/articles/Linux/",
        },
        {
          text: "接口设计",
          link: "/articles/接口设计/",
        },
        {
          text: "编程场景设计",
          link: "/articles/编程场景设计/",
        },
        {
          text: "消息队列",
          link: "/articles/消息队列/",
        },
        {
          text: "设计模式",
          link: "/articles/设计模式/",
        },
        {
          text: "计算机知识",
          link: "/articles/计算机知识/",
        },
        {
          text: "音视频",
          link: "/articles/音视频/",
        },
        {
          text: "爬虫技术",
          link: "/articles/spider/",
        },
      ],
    },
  },
};
