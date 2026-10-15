# 后端镜像（FastAPI + 内嵌阅读服务 + 管理后台静态资源）
#
# 构建上下文必须是仓库里的 Kirameku-backend 目录：
#   docker build -t kirameku-backend ../../Kirameku-backend
# （相对路径以 deploy/docker-compose.yml 所在目录为基准）
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 国内服务器加速：清华 PyPI 源
COPY requirements.txt ./
RUN pip install --no-cache-dir \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    -r requirements.txt

COPY . .

# 上传目录：头像 / 相册 / 文章配图落盘位置，运行时可能写入，不设只读
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
