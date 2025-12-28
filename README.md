# Image Management System (IMAGERIE)

一个基于 AI 的现代图片管理平台，支持图片的 AI 分析、搜索、裁剪、调色及 EXIF 信息提取等功能。（浙江大学 BS 体系软件设计大程）

## 注意事项

内含高德地图和 OpenRouter 的 API，不要在未经删除的情况下上传互联网或发送给任何人（尽管我已设置了限额）。

## 快速开始：使用 Docker 运行

这是最简单快捷的运行方式，已配置好所有环境变量和数据库。

1. **克隆仓库**
   ```bash
   git clone https://github.com/arriettych/ZJU-25-BS.git
   cd ZJU-25-BS
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. 打开浏览器，访问 `http://localhost:8080`