# 现代思维人生指南 · 这件事，下一步

免费公开试用：从一个场景开始，读一点有用的提示。愿意时留下自己的判断，之后带着新事实回来。

在线入口：[打开网页](https://fancy0121.github.io/modern-thinking-guide/)（GitHub Pages启用后生效）。项目：[fancy0121/modern-thinking-guide](https://github.com/fancy0121/modern-thinking-guide)。

## 怎么用

1. 按场景浏览或搜索指南。这里是本项目原创通用建议，不是付费课程原文或专业结论。
2. 愿意时记下一件事、当前判断、下一步和回看信号。未形成判断也可以留空；保存只在本浏览器，修订成为新版本，旧版保留。
3. 想用AI帮忙时，复制自己选择的指南与背景，粘贴到你已有的AI工具。本站没有托管AI聊天服务，不收AI调用费用；你所用的AI服务可能自行收费。单纯阅读与记录不需要AI账号。
4. 可导出JSON备份，再导入本工具。不同设备之间不会自动同步。可下载[离线网页](./offline.html)或[完整使用包](./download/modern-thinking-guide.zip)。

公开指南全文：[guide.md](./guide.md)。可选[指南Skill](./skills/modern-thinking-public/SKILL.md)，适合已有支持Skill的AI客户端；不用安装也可以直接读网页。

## 本版范围

全部免费，无广告、账户、付款、遥测和云端个人档案。功能是指南阅读、检索、自愿记录和辅助整理；尚未证明认知增益或现实效果，不把发布成功当作产品效果成功。

课程PDF、蒸馏库、私人问题、内部评测、登录凭据和模型后端不在此公开项目中。本站不代表任何课程作者，也不以作者名提供官方服务。

隐私和数据边界见[PRIVACY.md](./PRIVACY.md)，免费使用与权利范围见[NOTICE.md](./NOTICE.md)。

## 发布结构

纯HTML/CSS/JavaScript，由GitHub Pages发布；没有服务端或数据库，不需要配置API Key。版本源是content/guides.json；更改它后运行`python tools/build.py`，派生指南JS、Markdown、离线网页和下载包，再提交已检查文件。无需第三方依赖。

本地预览可在本目录运行`python -m http.server 8000 --bind 127.0.0.1`，然后打开http://127.0.0.1:8000/；只想离线使用，双击offline.html即可。部分浏览器对本地文件的保存行为不同，请导出重要记录作备份。

发布形式受到[HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)的场景入口、轻量静态页面和可选Skill启发。本项目没有复制它的正文、代码、排序算法或价值判断。

## 反馈

可以在[GitHub Issues](https://github.com/fancy0121/modern-thinking-guide/issues)反馈页面问题和使用负担。Issues是公开的，请勿填写证件、密码、私人聊天、单位保密材料或可识别他人的故事。反馈是自愿的，不要求交个人问题才能使用。
