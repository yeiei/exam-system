# 在线答题系统 (exam-system)

一款面向特种作业人员的在线答题培训系统，支持考试、练习、背题、查题四种模式。

## 功能说明

### 🎯 四种答题模式

| 模式 | 说明 |
|------|------|
| **考试模式** | 随机抽取 100 道题目（单选60+多选20+判断20），模拟真实考试环境 |
| **练习模式** | 顺序练习，即时反馈答题结果，适合日常学习 |
| **背题模式** | 直接显示答案和解析，适合考前突击记忆 |
| **查题模式** | 关键词搜索题目，分页浏览所有题库 |

### 📊 其他功能

- 用户注册登录
- 答题记录历史查询
- 错题本管理
- 学习统计（正确率、最高分、平均分）

## 题库说明

本系统内置以下题库：

- **电工题库** - 低压电工特种作业考试题目
- **高处安装、维护、拆除作业** - 高处作业安全培训题目

## 技术栈

- **后端**：Node.js + Express
- **数据库**：JSON 文件存储（无需配置）
- **前端**：原生 HTML/CSS/JavaScript

### 核心依赖

- `express` - Web 框架
- `express-session` - 会话管理
- `bcryptjs` - 密码加密
- `xlsx` - Excel 题库导入
- `cors` - 跨域支持

## 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/yeiei/exam-system.git
cd exam-system

# 2. 安装依赖
npm install
```

## 运行说明

### 启动服务

```bash
npm start
```

服务启动后访问：http://localhost:3000

### 导入题库（可选）

如果需要更新题库，可使用题库导入脚本：

```bash
npm run import
```

题库文件放在 `data/` 目录下，支持 Excel 格式（.xlsx）。

## 项目结构

```
exam-system/
├── data/               # 数据目录
│   ├── questions.json  # 题库数据
│   ├── users.json      # 用户数据
│   ├── records.json    # 答题记录
│   └── *.xlsx          # 题库源文件
├── public/             # 前端静态文件
├── src/
│   └── server.js      # 服务端代码
├── package.json
└── README.md
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/questions` | GET | 获取题目 |
| `/api/submit` | POST | 提交答案 |
| `/api/history` | GET | 答题历史 |
| `/api/wrong` | GET | 错题本 |
| `/api/stats` | GET | 学习统计 |
| `/api/all-questions` | GET | 查题（搜索） |

## GitHub

https://github.com/yeiei/exam-system

---

Made with ❤️ for better workplace safety.
