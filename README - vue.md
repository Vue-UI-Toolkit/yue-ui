# yue-ui

>vue 2.x UI-Toolkit


- **doing**


# 开发一个vue UI组件库

## 1. vue官方的脚手架
```
# 全局安装 vue-cli
$ npm install --global vue-cli
# 创建一个基于 webpack 模板的新项目
$ vue init webpack my-project
# 安装依赖
$ cd my-project
$ npm install
$ npm run dev
```

- 对 vue-cli 生成的项目结构做一下改造：
```


|-- examples      // 原 src 目录，改成 examples 用作示例展示
|-- packages      // 新增 packages 用于编写存放组件


```

>这样的话 我们需要再把我们 webpack 配置文件稍作一下调整，
首先是把原先的编译指向 src 的目录都改成 examples，  如：入口和别名部分
其次为了 npm run build 能正常编译 packages 我们也需要为 babel-loader 再增加一个编译目录：

```
{
   test: /\.js$/,
   loader: 'babel-loader',
   include: [resolve('examples'), resolve('test'), resolve('packages')]
}
```

这样我们搭建起来一个简易的目录结构。

- 如何编写文档。

```
npm i -S markdown-it-anchor markdown-it-container vue-markdown-loader cheerio  less less-loader
```

>对于文档的编写，自然是 markdown 最合适不过了，那么怎么让我们在 vue 下可以去写 markdown 文档呢？

当然是 vue-markdown-loader ，然后我们按照文档配置了相关的插件信息：

```
rules: [
   {
     test: /\.md$/,
     loader: 'vue-markdown-loader'
   }
 ]
```

好了，我们可以开始尝试写文档了，在 example/docs 目录下新建 test.md。

```
# test
> Hello World
```

同时创建一个新的路由，指向我们的md文件：

```
{
  path: '/test',
  name: 'test',
  component: r => require.ensure([], () => r(require('../docs/test.md')))
}
```

打开我们的浏览器 http://localhost:8080/#/test

问题还在后面：我们期望的文档不仅能编译 markdown，而且最好能识别 demo 代码块一方面做演示，一方面可以显示演示代码最好了

- vue-mark-down 功能肯定不止这些！于是我们继续阅读它的文档，发现其实他就是封装了 markdown-it，支持 options 选项。
这样我们就可以为我们的 markdown 定义独特的标识符，这里我用 demo 标识需要显示代码块的地方，
所以需要配置 options 选项 ：

```

const MarkdownItContainer = require('markdown-it-container')
const striptags = require('./strip-tags')

const vueMarkdown = {
  preprocess: (MarkdownIt, source) => {
    MarkdownIt.renderer.rules.table_open = function () {
      return '<table class="table">'
    }
    MarkdownIt.renderer.rules.fence = utils.wrapCustomClass(MarkdownIt.renderer.rules.fence)
    return source
  },
  use: [
    [MarkdownItContainer, 'demo', {
      // 用于校验包含 demo 的代码块
      validate: params => params.trim().match(/^demo\s*(.*)$/),
      render: function(tokens, idx) {

        var m = tokens[idx].info.trim().match(/^demo\s*(.*)$/);

        if (tokens[idx].nesting === 1) {
          var desc = tokens[idx + 2].content;
          // 编译成 html
          const html = utils.convertHtml(striptags(tokens[idx + 1].content, 'script'))
          // 移除描述，防止被添加到代码块
          tokens[idx + 2].children = [];

          return `<demo-block>
                        <div slot="desc">${html}</div>
                        <div slot="highlight">`;
        }
        return '</div></demo-block>\n';
      }
    }]
  ]
}
----------------------------------------------

strip-tags：

/**
 * 转换成 DOM 字符串
 */
const cheerio = require('cheerio')

module.exports = (str, tags) => {
  const $ = cheerio.load(str, { decodeEntities: false })

  if (!tags || tags.length === 0) {
    return str
  }

  tags = !Array.isArray(tags) ? [tags] : tags
  let len = tags.length

  while (len--) {
    $(tags[len]).remove()
  }

  return $.html()
}
```

这里简单的描述一下这段代码是干什么的：

>首先把内容里面 vue 片段编译成 html，用于显示，另一方面用 highlight 来高亮代码块。
demo-block 本身是我们定义好的组件：

```
<template>
  <div class="docs-demo-wrapper">
      <div :style="{maxHeight: isExpand ? '700px' : '0'}" class="demo-container">
        <div span="14">
          <div class="docs-demo docs-demo--expand">
            <div class="highlight-wrapper">
              <slot name="highlight"></slot>
            </div>
          </div>
        </div>
      </div>
    <span
           class="docs-trans docs-demo__triangle"
           @click="toggle">{{isExpand ? '隐藏代码' : '显示代码'}}</span>
  </div>
</template>
```
这样，我们的 test.md 便可以这么去写

## 2.如何编写组件

```
packages
  |
  |--button
  |    |
  |    |---index.js
  |
  |
  |---index.js


buttom/index.js:

import Button from './button.vue';

Button.install = function (Vue) {
  Vue.component(Button.name, Button);
};

export default Button;
```


- packages/index.js

>环境准备完毕，紧接着要开始编写组件，考虑的是组件库，所以我们尽可能让我们的组件支持全局引入和按需引入，
如果全局引入，那么所有的组件需要要注册到Vue component 上，并导出：
```
const install = function(Vue) {
  if (install.installed) return;
  components.map(component => Vue.component(component.name, component));
};

export default {
  install
};
```

- 要实现按需加载，我们只需要单个导出组件即可：

```
import Button from './button/index.js';

const components = [
  Button
];

const install = function(Vue) {
  if (install.installed) return;
  components.map(component => Vue.component(component.name, component));
};

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}

export default {
  install,
  Button
};
```


## 3.还需要考虑一个问题：既然是单页面应用，必然要去解决样式冲突问题，如果组件内使用 soped，那么样式就无法从组件内抽离出来，

达不到可定制化主题颜色的目的。

我们需要一套可以分离处理的样式，可以自行编译，可以相互不污染。这时候 css 的 BEM 规范就显得尤为重要

目前对 BEM 规范支持较好的插件就是 postcss 了，他允许我们配置 BEM 之间的连接符和缩写：
```
{
  "browsers": ["ie > 8", "last 2 versions"],
  "features": {
    "bem": {
      "shortcuts": {
        "component": "b",
        "modifier": "m",
        "descendent": "e"
      },
      "separators": {
        "descendent": "__",
        "modifier": "--"
      }
    }
  }
}
```

- 可以说看是测试使用：

```
import TTUI from '../packages/index'
import '../packages/theme-default/lib/index.css'

Vue.use(TTUI)
```


##

- [element](https://github.com/ElemeFE/element)
- [iview](https://github.com/iview/iview)
- [heyui](https://github.com/heyui/heyui)
- [markdown-it-container](https://cnpmjs.org/package/markdown-it-container)
- [markdown-it](https://github.com/markdown-it/markdown-it)

- [从零开始搭建 Vue 组件库](https://zhuanlan.zhihu.com/p/30948290)

- [使用 webpack4 搭建一个基于Vue的组件库](https://juejin.im/post/5b68244e6fb9a04fb212d1a0)

- [揭秘组件库一二事](https://my.oschina.net/qiangdada/blog/1637920)
