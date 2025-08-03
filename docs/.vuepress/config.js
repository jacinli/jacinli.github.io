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
  erviceWorker: true,
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
          text: "网络",
          children: ["/articles/网络/2025-03-21-点击劫持.md"],
        },
      ],
    },
  },
};
