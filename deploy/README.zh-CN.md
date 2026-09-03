# HelloLabel 1.5 纯静态部署

HelloLabel 1.5 的 Web 版不再需要 Python、FastAPI、Uvicorn、OpenCV、PyTorch 或服务端 AI。ECS 只负责通过 Nginx 发送 HTML / CSS / JavaScript / 图标等静态资源。

## 架构

```text
阿里云 ECS
└─ Nginx / HTTPS
   └─ HelloLabel 静态文件
          ↓
       Chrome / Edge
          ├─ File System Access API：本地读取图片、本地读写 JSON
          ├─ WebGL2：标注渲染
          ├─ WebGPU / WASM：AI 推理
          └─ Cache Storage：按需缓存 AI 模型
```

用户打开的原始图片和同名 JSON 不上传到 HelloLabel ECS。AI 模型第一次使用时由浏览器从模型源下载并缓存，推理发生在用户设备。

## 1. 生成静态发布目录

Linux / macOS：

```bash
bash build_web.sh
```

Windows：

```bat
build_web.bat
```

输出：

```text
dist/web/
├─ index.html
├─ VERSION.txt
└─ static/
   ├─ app.js
   ├─ app-core.js
   ├─ browser-runtime.js
   ├─ sam-worker.js
   ├─ style.css
   └─ ...
```

## 2. 上传到 ECS

例如：

```bash
sudo mkdir -p /var/www/hellolabel
sudo rsync -a --delete dist/web/ /var/www/hellolabel/
```

也可以使用 SCP、SFTP、GitHub Actions 等方式上传。生产服务器不需要安装 HelloLabel 的 Python 依赖。

## 3. Nginx

复制 `deploy/nginx.conf.example`，修改：

- `label.example.com` 为你的域名；
- `/var/www/hellolabel` 为实际静态目录；
- TLS 证书路径为实际证书路径。

例如：

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/conf.d/hellolabel.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 4. 必须使用 HTTPS

Web 版依赖 File System Access API。localhost 属于安全上下文，但公网域名应使用 HTTPS。推荐使用 Let's Encrypt 或阿里云证书，并把 HTTP 80 重定向到 HTTPS 443。

## 5. ECS 资源与流量

2 核 4 GB ECS 足够提供 HelloLabel 静态站点。打开本地图片时，图片不经过 ECS，因此不会产生“上传原图 → ECS → 返回预览图”的双向大流量。

ECS 主要出站内容只有：

- HTML / CSS / JavaScript；
- 图标及其他静态资源；
- 新版本更新后的前端文件。

AI 模型不要求放在 ECS。当前浏览器 AI 使用外部模型源，模型首次使用时下载到客户端浏览器缓存。之后由浏览器缓存复用。

## 6. v1.5 浏览器 AI 范围

当前纯浏览器运行时以以下能力为正式范围：

- YOLO11 Detect：浏览器本地推理；
- YOLO11 Seg：浏览器本地推理；
- SlimSAM：浏览器本地交互分割；
- WebGPU 优先，失败后使用 CPU / WASM 兼容路径；
- TIFF 在浏览器内解码，不上传服务器。

YOLO-World、SAM2、SAM3 的旧 Python 后端不属于 v1.5 的纯静态正式运行路径；界面中应明确标记或禁用未迁移能力，避免回退到服务端上传。

## 7. 更新版本

重新构建并覆盖静态目录即可：

```bash
git pull
bash build_web.sh
sudo rsync -a --delete dist/web/ /var/www/hellolabel/
sudo nginx -t && sudo systemctl reload nginx
```

HelloLabel 的 `index.html` 与启动脚本使用较短缓存/禁止缓存策略，其余静态文件使用版本参数与缓存策略，因此正常刷新即可获取新版本。
