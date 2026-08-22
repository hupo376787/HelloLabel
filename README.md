# HelloLabel

HelloLabel 是一个独立的、仿 Labelme 的高性能网页标注程序。专注于图像标注和 AI 辅助标注。

## 截图
![](/screenshots/1.jpg)
![](/screenshots/2.jpg)
![](/screenshots/3.jpg)

## 功能

- 手工工具：指针、画笔、多边形、矩形、有向矩形、圆形、点、直线、折线。
- 指针编辑：选择/移动实例；拖动控制点修改形状；多边形/折线双击边插入点；选中控制点后 Delete 删除点。
- 标签：新增、删除、重命名、颜色修改；标签变化同步到关联实例。未预选标签时弹出的“选择标签”窗口支持双击已有标签直接确定并关闭。
- 图片列表：支持按文件名实时过滤，标题明确为“图片列表”。
- 中英文界面：顶部可在中文 / English 间切换，并记住选择。
- AI 工具栏：顶部开关可显示 / 隐藏整行 AI 工具栏，并记住显示状态；隐藏后工作区自动释放对应高度。
- 实例列表：虚拟滚动；与画布双向联动；选中时定位并闪烁。
- 显示标签：支持智能 / 全部 / 仅选中，不再把实例编号绘制到图上。
- 亮度 / 对比度：仅影响浏览器显示，不修改原图，也不改变 AI 输入图像。
- Undo / Redo：`Ctrl+Z`、`Ctrl+Y` / `Ctrl+Shift+Z`。
- 自动保存：所有标注数据修改 300 ms 防抖后保存为图片同名 JSON，同时保留“保存 JSON”。
- WebGL2 批量渲染 + 空间网格命中测试 + 虚拟列表，面向 1000+ 标注场景。
- AI：SAM / SAM2 / SAM3 交互分割；YOLO11 Detect；YOLO11 Seg；YOLO-World 文本标注。

## 启动

Windows 直接双击 `start_web.bat`。首次运行时它会自动：

1. 在 HelloLabel 目录创建独立的 `.venv`。
2. 使用 `.venv\Scripts\python.exe -m pip` 升级该环境自己的 pip。
3. 把 `requirements.txt` 中的基础依赖安装到 `.venv`。
4. 用同一个 `.venv` 启动 HelloLabel。

以后再次运行 `start_web.bat` 会直接复用 `.venv`，不会重复创建环境。若检测到基础依赖不完整，只会在该 `.venv` 内修复。程序**不会使用系统 pip 安装依赖，也不会修改其他 Python 项目的包**。

启动后 Chrome / Edge 打开 `http://127.0.0.1:9010`，点击“打开文件夹”，授予浏览器读取/写入图片目录权限。

HelloLabel 使用独立端口 **9010**。基础编辑功能不依赖 PyTorch 或任何 AI 模型。

> 文件夹自动读写使用 File System Access API，推荐最新版 Chrome / Edge，并从 localhost 打开。其他浏览器如果没有该 API，无法获得同等的目录自动保存能力。

## Labelme JSON

`shapes` 保持 Labelme 结构，例如：

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

HelloLabel 只增加顶层 `hellolabel.labels` 保存标签颜色。旧版 `labelit` 扩展字段只作为兼容输入读取，保存时会统一迁移为 `hellolabel`。实例 ID、AI 运行时来源等编辑状态只保存在浏览器内存中，不写入 JSON。

标准标注几何仍由 `shapes[].label / points / shape_type` 表示。纯 Labelme JSON 没有 `hellolabel` 字段时，HelloLabel 会自动补齐 `hellolabel.labels` 并为标签生成稳定颜色。旧版包含 `labelit` 扩展字段的 JSON 仍可读取；首次保存时会自动迁移为 `hellolabel`，不再写回 `labelit`。

支持的 `shape_type`：

- `polygon`
- `rectangle`（JSON 中仍用两个对角点）
- `oriented_rectangle`（4 个点）
- `circle`（圆心 + 圆周点）
- `point`
- `line`
- `linestrip`

画笔结束后保存为 `polygon`。

## 标签行为

- 已选择右侧标签：新标注直接使用该标签。
- 未选择标签：完成图形后弹窗选择已有标签或输入新标签；单击已有标签后点“确定”，或直接双击已有标签即可确定并关闭弹窗。
- 删除未使用标签：确认后直接删除。
- 删除正在使用的标签：必须选择替代标签 / 新建替代标签；也提供明确标红的“同时删除关联实例”危险选项。
- 重命名：确认时提示关联实例数量，并同步更新所有关联标注。
- 重命名为已有标签：合并到已有标签并采用已有标签颜色。
- 修改标签颜色：该标签的所有图中实例立即同步变色。

## 手工标注操作

| 工具 | 快捷键 | 操作 |
|---|---:|---|
| 指针 | V | 选择、移动、编辑控制点 |
| 画笔 | B | 单击开始，不用按住鼠标；移动绘制；靠近起点自动闭合 |
| 多边形 | P | 连续单击，Enter / 双击完成 |
| 矩形 | R | 拖动创建 |
| 有向矩形 | O | 点第一点 → 点第一条边终点 → 第三点确定宽度 |
| 圆形 | C | 从圆心拖到圆周 |
| 点 | D | 单击 |
| 直线 | L | 两次单击 |
| 折线 | K | 连续单击，Enter / 双击完成 |

其他操作：

- `Delete`：删除当前控制点或当前选中实例。
- `Ctrl+Z`：撤销。
- `Ctrl+Y` / `Ctrl+Shift+Z`：重做。
- `Esc`：取消当前绘制 / AI 交互。
- `Space + 拖动` 或中键拖动：平移。
- 滚轮：围绕鼠标位置缩放。
- 多边形 / 折线在指针模式下双击某条边：插入一个新控制点。

## SAM / SAM2 / SAM3 交互

顶部选择：

- 模型：SAM / SAM2 / SAM3。
- 输出：Polygon / Rectangle / Oriented Rectangle / Circle。

Circle 使用 **minimum enclosing circle（最小包围圆）**。

AI 交互模式：

- 左键单击：正样本点。
- 右键单击：负样本点。
- 左键拖框：Box Prompt。
- 每次增加 prompt 后重新推理；同一图片会缓存 image embedding；图片在打开预览时还会生成后端短期 image token，后续 SAM 点击不会反复上传整张原图。
- Backspace：撤销最后一个 prompt。
- Enter / “接受结果”：保存当前 AI 结果为新实例。
- Esc / “取消”：丢弃本次 AI 交互。

### SAM

`config.json` 默认：

```json
"sam": {
  "model_type": "vit_b",
  "checkpoint": "models/sam_vit_b_01ec64.pth"
}
```

下载对应官方 checkpoint 后放到 `models/`，或者修改路径。

### SAM2

默认从 Hugging Face 加载：

```json
"sam2": {
  "model_id": "facebook/sam2.1-hiera-small",
  "checkpoint": "",
  "config": ""
}
```

也可以填写本地 checkpoint 与 SAM2 config 路径。

### SAM3

HelloLabel 使用 SAM3 的 instance-interactive predictor，以 SAM 风格的正/负点和 box prompt 工作。默认由官方包从 Hugging Face 获取 checkpoint。

SAM3 的官方环境要求比基础 HelloLabel 更严格。当前官方 README 要求 Python 3.12+、PyTorch 2.7+，CUDA GPU 场景还应按官方推荐配置；其 Hugging Face checkpoint 也可能要求先获得访问权限并登录。若 SAM3 未安装/未授权，HelloLabel 本体以及其他模型仍可正常使用；顶部“模型状态”会显示原因。

## YOLO11 / YOLO-World

- **YOLO11 Detect**：整图检测，输出 Labelme rectangle。文本框可选，用于按类别名过滤（例如 `dog,cat,bird`）；留空表示保留全部检测类别。
- **YOLO11 Seg**：整图实例分割。输出类型可选 Polygon / Rectangle / Oriented Rectangle / Circle。文本框同样可作为可选类别过滤；留空表示全部类别。
- **YOLO-World**：在文本框输入例如 `dog,cat,bird`，再设置 Score 与 IoU 后运行；结果输出 rectangle。

默认权重：

```json
"yolo11_detect": {"weights": "yolo11n.pt"},
"yolo11_seg": {"weights": "yolo11n-seg.pt"},
"yolo_world": {"weights": "yolov8s-world.pt"}
```

Ultralytics 会在第一次使用时按其机制获取缺失权重，也可以将 `weights` 改成本地路径。

## AI 安装

需要 AI 功能时运行：

```bat
install_ai.bat
```

AI 安装脚本和 `start_web.bat` 使用**同一个 HelloLabel `.venv`**。所有安装命令都显式通过 `.venv\Scripts\python.exe -m pip` 执行，不调用系统 `pip`，因此不会污染 Cellpose、其他项目或系统 Python。

如果 `.venv` 尚不存在，`install_ai.bat` 也会先创建它并安装基础依赖。AI 安装前请先关闭正在运行的 HelloLabel；脚本会检测 9010 端口，避免 Windows 锁住 `cv2.pyd` 导致 `[WinError 5] 拒绝访问`。

HelloLabel 基础环境使用 `opencv-python-headless`，AI 安装也使用 Ultralytics 的 headless 变体，避免同时安装 `opencv-python` 与 `opencv-python-headless` 造成 `cv2` 文件冲突。已有 **PyTorch 2.7+** 会保留；如果版本不足或尚未安装，检测到 NVIDIA 驱动时会从 PyTorch 官方 **CUDA 12.6** wheel 源安装/升级，否则安装 CPU 版。所有操作仍只发生在 **HelloLabel 的 `.venv`**。SAM3 安装失败不会影响基础 HelloLabel。

从 v0.1.6 起，`install_ai.bat` **不再依赖 Git 或 `git clone`**。这是为了规避 Windows 上常见的 Git/OpenSSL/公司代理导致的 `SSL_ERROR_SYSCALL`。SAM 使用 `segment-anything-py`（保持 `segment_anything` API），SAM2 使用 `RF-SAM-2`（保持 `sam2` API），SAM3 使用 `sam3` 的 PyPI 分发，并在安装后逐项执行 import 校验。因此正常 AI 安装只需要访问 PyPI / files.pythonhosted.org、PyTorch 官方 wheel 源和后续模型权重来源。

## 性能设计

HelloLabel 不为每个标注创建一个 DOM/SVG 元素。常规实例由 WebGL2 批量绘制，SVG overlay 只负责正在创建或当前选择/编辑的实例和控制点；标签文字使用纹理 atlas；点击命中使用图像空间网格索引；右侧实例列表只渲染可见窗口。

这套结构是为了让上千个标注时，缩放、平移、选择、列表滚动仍保持可用流畅度。实际性能取决于图片分辨率、复杂 polygon 顶点总数和 GPU/浏览器。

## 模型状态与错误处理

点击顶部“模型状态”可以检查：

- Python 包是否存在；
- SAM checkpoint 是否存在；
- 模型是否已经加载；
- 缺失依赖/授权等错误。

AI 模型全部采用 lazy loading。启动 HelloLabel 不会一次性把 SAM/SAM2/SAM3/YOLO 全部载入显存。图片原始压缩字节采用小型 LRU 缓存（默认最多 4 张/约 256 MB），用于降低连续 SAM Prompt 和 YOLO 请求的重复上传开销；缓存失效时前端会自动重传当前图片。

## 目录

```text
HelloLabel/
├─ ai/
│  ├─ geometry.py
│  └─ model_manager.py
├─ models/
├─ static/
│  ├─ index.html
│  ├─ app.js
│  ├─ style.css
│  ├─ hellolabel-icon.png
│  └─ favicon.png
├─ tests/
├─ config.json
├─ run.py
├─ requirements.txt
├─ requirements-ai.txt
├─ install_ai.bat
├─ start_web.bat
└─ web_api.py
```

## Desktop packaging (Windows / macOS / Linux)

HelloLabel includes an Electron desktop shell under `desktop/`. The desktop build keeps the WebGL2 web UI and launches the FastAPI backend as a bundled local sidecar. This gives one UI codebase while producing platform-specific installers.

- Windows: `desktop\build_windows.bat` -> NSIS installer + portable build
- macOS: `desktop/build_macos.sh` -> DMG + ZIP
- Linux: `desktop/build_linux.sh` -> AppImage + DEB

**Desktop release builds intentionally do not bundle AI frameworks or model weights.** `desktop/hellolabel-server.spec` excludes Torch、Ultralytics、SAM/SAM2/SAM3、Hugging Face packages and `models/` weights, so release installers remain base-editor packages even if the local `.venv` already contains AI.

### GitHub Actions 自动构建

仓库包含 `.github/workflows/desktop-build.yml`。该 Workflow **只在推送匹配 `v*` 的 Git Tag 时触发**，不会因普通分支 push、Pull Request 或手动 `workflow_dispatch` 而构建。触发后自动分别生成：

- Windows x64：NSIS + Portable
- macOS Apple Silicon：DMG + ZIP
- macOS Intel x64：DMG + ZIP
- Linux x64：AppImage + DEB

推送 `v*` Tag（例如 `v0.2.5`）后，Workflow 会保存各平台构建 Artifacts，并自动创建/更新对应 GitHub Release，上传各平台/架构的安装包。Workflow 只安装 `requirements.txt`，不会运行 `install_ai.*`，因此 CI 产物同样不包含 AI。

程序图标位于 `desktop/build/`：Windows 使用 `icon.ico`、macOS 使用 `icon.icns`、Linux 使用 `build/icons/` 多尺寸 PNG。圆角矩形以外区域具有透明 Alpha，安装后的程序图标直接使用这一套资源。

See `desktop/README.md` for details.


## AI 菜单安装

汉堡菜单 → **AI → 安装 AI** 时，源码版不会再让正在运行的 Python 服务直接去启动安装器。`start_web.bat` / `start_web.sh` 会先等待 HelloLabel 服务完整退出并释放 9010、`cv2.pyd` 和 Torch DLL，然后由启动脚本接力执行对应的 `install_ai.bat` / `install_ai.sh`。因此只需点击一次；安装完成后重新启动 HelloLabel。桌面开发模式同样支持该入口。当前正式桌面发行包不内置 AI；源码/Web 启动模式仍可通过该入口安装 AI。
