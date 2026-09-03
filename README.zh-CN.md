# HelloLabel

[English](README.md) | **简体中文**

HelloLabel 是一个独立的、仿 Labelme 的高性能图像标注程序。**v1.5.0 开始采用本地优先、纯静态 Web 架构**：服务器只负责发送 HTML / CSS / JavaScript，图片、同名 JSON 和 AI 推理都留在用户设备。

## v1.5.0 架构

```text
                   HelloLabel 1.5
                        │
           ┌────────────┴────────────┐
           │                         │
        Web 版                    Desktop 版
           │                         │
     Nginx 静态站点            Electron 静态站点
           │                         │
           └────────────┬────────────┘
                        ▼
                  Chrome / Chromium
            ┌───────────┼────────────┐
            │           │            │
      本地图片/JSON    WebGL2      WebGPU/WASM
            │           │            │
       本地读写文件    标注渲染      AI 推理
```

- **没有 HelloLabel 服务端 API**：生产 Web 版不需要 Python、FastAPI、Uvicorn、OpenCV、PyTorch。
- **原图不上传 ECS**：打开图片、切图、缩放、标注、保存 JSON 都在浏览器本地完成。
- **AI 在客户端运行**：优先使用 WebGPU，必要时回退 CPU / WASM。
- **模型按需下载并缓存**：第一次使用 AI 时由浏览器下载模型，后续复用浏览器缓存。
- **Desktop 与 Web 共用同一套前端核心**：EXE 不再捆绑 Python Runtime。

## 截图

![](/screenshots/1.jpg)
![](/screenshots/2.jpg)
![](/screenshots/3.jpg)

## 演示视频

[![HelloLabel 演示视频](https://img.youtube.com/vi/gQxBUNJIDA4/hqdefault.jpg)](https://youtu.be/gQxBUNJIDA4)

[在 YouTube 上观看](https://youtu.be/gQxBUNJIDA4)

## 核心功能

- 手工工具：指针、画笔、多边形、矩形、有向矩形、圆形、点、直线、折线。
- 指针编辑：选择 / 移动实例；拖动控制点修改几何；多边形/折线靠近边线吸附后单击插入新顶点。
- 多边形：靠近起点自动磁吸；磁吸时起点圆圈放大到磁吸范围，单击闭合；右键逐点回撤。
- 矩形：绘制时显示贯穿图像边界的水平/垂直十字辅助线，便于对齐定位。
- 完成图形后右键：多边形、折线、矩形、有向矩形、圆形、直线可重新进入绘制状态；Esc 恢复原图形。
- 标签：软件级全局 Label 库，独立于当前图片；导入支持 HelloLabel/Labelme JSON、标签库 JSON、TXT、逗号/换行分隔文本。
- 实例：每张图片独立；实例列表虚拟滚动并与画布双向联动。
- 显示：WebGL2 批量渲染、空间网格命中测试、智能/全部/仅选中标签显示、亮度/对比度预览。
- Undo / Redo：`Ctrl+Z`、`Ctrl+Y` / `Ctrl+Shift+Z`。
- 自动保存：标注修改后约 300 ms 防抖保存同名 JSON，同时保留手动保存。
- 中英文界面、亮/暗/系统主题、左右面板折叠、AI 工具栏显示状态记忆。

## v1.5 浏览器本地 AI

当前纯浏览器正式路径：

| 功能 | v1.5 状态 | 运行位置 |
|---|---|---|
| YOLO11 Detect | 可用 | 浏览器 WebGPU / CPU-WASM |
| YOLO11 Seg | 可用 | 浏览器 WebGPU / CPU-WASM |
| SlimSAM 交互分割 | 可用 | 浏览器 WebGPU / WASM |
| TIFF 解码预览 | 可用 | 浏览器本地 |
| YOLO-World | 暂未迁移，界面禁用 | — |
| SAM2 / SAM3 | 不再走旧 Python 后端 | — |

SlimSAM 支持：

- 左键单击：正样本；
- 右键单击：负样本；
- 左键拖动：Box Prompt；
- Backspace：撤销最后一个提示；
- Enter：接受结果；
- 输出可转换为 Polygon / Rectangle / Oriented Rectangle / Circle。

同一张图片只需要生成一次 SAM image embedding，后续提示复用该 embedding。切换图片后重新编码。

> 首次 AI 使用需要联网下载浏览器模型与运行时。模型下载流量来自模型/CDN 源，不需要让 HelloLabel ECS 接收原始图片并执行推理。

## Web 本地启动

HelloLabel v1.5 本身不需要 Python 后端，但浏览器页面仍应通过 HTTP/HTTPS 打开，而不是直接双击 `index.html`。

Windows 可运行：

```bat
start_web.bat
```

Linux / macOS：

```bash
bash start_web.sh
```

这两个脚本只使用 Python 自带的 `http.server` 作为**开发用静态文件服务器**，不会创建 `.venv`、不会安装 requirements，也不会运行 FastAPI。

开发地址：

```text
http://127.0.0.1:9010/static/
```

生产部署不需要 Python，直接使用 Nginx 等静态 Web Server。详细步骤见：

```text
deploy/README.zh-CN.md
```

## 阿里云 ECS 生产部署

先生成静态发布目录：

Windows：

```bat
build_web.bat
```

Linux / macOS：

```bash
bash build_web.sh
```

输出：

```text
dist/web/
├─ index.html
├─ VERSION.txt
└─ static/
```

把 `dist/web/` 的内容上传到例如 `/var/www/hellolabel/`，然后用 `deploy/nginx.conf.example` 配置 Nginx。

公网部署必须使用 HTTPS。File System Access API、WebGPU 以及浏览器 AI 在安全上下文中工作更稳定；示例 Nginx 配置同时启用了浏览器 AI 所需的跨源隔离响应头。

## Desktop / EXE

Desktop 版使用 Electron 包装同一套 `static/`：

```text
HelloLabel.exe
└─ Electron / Chromium
   └─ 本机 127.0.0.1 静态服务
      └─ static/
```

不再包含：

```text
CPython
FastAPI
Uvicorn
OpenCV
PyTorch
服务端 SAM/YOLO Runtime
```

Windows 本地构建：

```bat
desktop\build_windows.bat
```

macOS：

```bash
./desktop/build_macos.sh
```

Linux：

```bash
./desktop/build_linux.sh
```

构建机只需要 Node.js 22+。发布包用户不需要 Python。

## Labelme / HelloLabel JSON

标准几何继续使用 `shapes`：

```json
{
  "version": "7.0.4",
  "flags": {},
  "shapes": [
    {
      "label": "cell",
      "points": [[10, 10], [100, 100]],
      "group_id": null,
      "description": "",
      "shape_type": "rectangle",
      "flags": {},
      "mask": null
    }
  ],
  "imagePath": "image.jpg",
  "imageData": null,
  "imageHeight": 1456,
  "imageWidth": 816,
  "hellolabel": {
    "labels": {
      "cell": {"color": "#38c172"}
    }
  }
}
```

HelloLabel 增加顶层 `hellolabel.labels` 保存标签颜色等 HelloLabel 扩展信息。Labelme 打开文件时会忽略它不认识的扩展字段，因此核心 `shapes` 保持互相兼容。

支持的 `shape_type`：

- `polygon`
- `rectangle`（两个对角点）
- `oriented_rectangle`（4 点）
- `circle`（圆心 + 圆周点）
- `point`
- `line`
- `linestrip`

画笔最终保存为 `polygon`。

## 全局 Label 库

v1.5 的 Label 定义是**软件级全局库**：

- 切换图片、切换文件夹后仍保留；
- 当前图片的实例数量仍按当前图片统计；
- 新增/删除/重命名全局 Label 不自动重写历史标注 JSON；
- 删除或重命名 Label 不擅自修改已有 shape 的 `label`；
- 导入 Label 只合并标签定义，不修改标注 JSON；
- 同名标签导入时保留现有定义。

全局标签库保存在浏览器本地存储中。

## 手工操作

| 工具 | 快捷键 | 操作 |
|---|---:|---|
| 指针 | V | 选择、移动、编辑控制点 |
| 画笔 | B | 单击开始，移动鼠标描绘，靠近起点自动闭合 |
| 多边形 | P | 连续单击；靠近起点磁吸后单击闭合；右键逐点回撤 |
| 矩形 | R | 点击第一角 → 十字辅助线定位 → 点击另一角完成 |
| 有向矩形 | O | 两点确定第一条边 → 第三点确定宽度 |
| 圆形 | C | 点击圆心 → 点击圆周 |
| 点 | D | 单击 |
| 直线 | L | 两次单击 |
| 折线 | K | 连续单击，Enter 完成，右键逐点回撤 |

其他操作：

- `Delete / Backspace`：优先删除当前可编辑顶点，否则删除选中实例；
- `Ctrl+Z`：撤销已完成操作；绘制多边形/折线时单点回撤只使用右键；
- `Ctrl+Y` / `Ctrl+Shift+Z`：重做；
- `Esc`：取消当前绘制 / AI；右键重新打开已完成图形后，Esc 恢复原图形；
- `Space + 左键拖动` 或中键拖动：平移；
- 滚轮：围绕鼠标位置缩放；
- 指针靠近多边形/折线边线：磁吸，单击插入新顶点。

## 浏览器要求

Web 版推荐最新版 Chrome / Edge：

- File System Access API 用于选择本地文件夹和自动保存 JSON；
- WebGL2 用于高性能渲染；
- WebGPU 用于 AI 加速；
- 没有 WebGPU 时，支持的 AI 运行时会尝试 CPU / WASM 兼容路径。

公网必须使用 HTTPS；localhost 开发环境可以使用 HTTP。

## 自动检查

`master` 分支包含 `Static Runtime Check` GitHub Actions，用于检查：

- v1.5 静态架构关键文件是否完整；
- Desktop 是否重新引入 Python 后端；
- JavaScript 基础语法；
- Web/Desktop 构建配置是否仍为 browser-only。

## License

MIT License。第三方 AI 模型、浏览器推理库及其模型文件遵循各自的许可证，请以各上游项目的许可条款为准。
