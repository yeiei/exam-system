const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const usersFile = path.join(DATA_DIR, 'users.json');
const recordsFile = path.join(DATA_DIR, 'records.json');
const wrongFile = path.join(DATA_DIR, 'wrong.json');
const questionsFile = path.join(DATA_DIR, 'questions.json');
const questionBanksFile = path.join(DATA_DIR, 'question_banks.json');

function loadJson(file, defaultVal) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return defaultVal;
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

var users = loadJson(usersFile, []);
var records = loadJson(recordsFile, []);
var wrongQuestions = loadJson(wrongFile, []);
var questions = loadJson(questionsFile, []);
var questionBanks = loadJson(questionBanksFile, []);

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 答题页面路由
app.get('/exam', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(session({
  secret: 'exam-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// 注册（/api/register）
app.post('/api/register', async function(req, res) {
  try {
    var username = req.body.username;
    var password = req.body.password;
    if (!username || !password) {
      return res.json({ success: false, message: '请填写用户名和密码' });
    }
    
    if (users.find(function(u) { return u.username === username; })) {
      return res.json({ success: false, message: '用户名已存在' });
    }
    
    var hashedPassword = await bcrypt.hash(password, 10);
    var id = Date.now();
    users.push({ id: id, username: username, password: hashedPassword });
    saveJson(usersFile, users);
    
    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    res.json({ success: false, message: '注册失败' });
  }
});

// 注册（/api/auth/register 别名）
app.post('/api/auth/register', async function(req, res) {
  try {
    var username = req.body.username;
    var password = req.body.password;
    if (!username || !password) {
      return res.json({ success: false, message: '请填写用户名和密码' });
    }
    
    if (users.find(function(u) { return u.username === username; })) {
      return res.json({ success: false, message: '用户名已存在' });
    }
    
    var hashedPassword = await bcrypt.hash(password, 10);
    var id = Date.now();
    users.push({ id: id, username: username, password: hashedPassword });
    saveJson(usersFile, users);
    
    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    res.json({ success: false, message: '注册失败' });
  }
});

// 获取所有题目（支持分页和关键词搜索）- 无需登录，公开接口
app.get('/api/all-questions', function(req, res) {
  // 获取分页参数
  var page = parseInt(req.query.page) || 1;
  var pageSize = parseInt(req.query.pageSize) || 50;
  var keyword = req.query.keyword || '';
  var workType = req.query.workType || ''; // 可选：按题库类型筛选
  
  // 过滤题目
  var filteredQuestions = questions;
  
  // 按题库类型过滤
  if (workType) {
    filteredQuestions = filteredQuestions.filter(function(q) { return q.work_type === workType; });
  }
  
  // 按关键词搜索（搜索题干内容）
  if (keyword) {
    var keywordLower = keyword.toLowerCase();
    filteredQuestions = filteredQuestions.filter(function(q) { 
      return q.content && q.content.toLowerCase().includes(keywordLower);
    });
  }
  
  // 计算分页
  var total = filteredQuestions.length;
  var totalPages = Math.ceil(total / pageSize);
  var startIndex = (page - 1) * pageSize;
  var endIndex = startIndex + pageSize;
  var paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);
  
  // 返回题目数据（包含完整信息：ID、题干、选项、答案）
  var result = paginatedQuestions.map(function(q) {
    return {
      id: q.id,
      question_type: q.question_type,
      content: q.content,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      answer: q.answer,
      work_type: q.work_type,
      score: q.score
    };
  });
  
  res.json({ 
    success: true, 
    data: result,
    pagination: {
      page: page,
      pageSize: pageSize,
      total: total,
      totalPages: totalPages
    }
  });
});

// 获取题库列表
app.get('/api/question-banks', function(req, res) {
  res.json({ success: true, banks: questionBanks });
});

// 登录（支持选择题库）
app.post('/api/login', async function(req, res) {
  try {
    var username = req.body.username;
    var password = req.body.password;
    // 支持 workType 或 bankId 参数
    var workType = req.body.workType || req.body.bankId; // 题库类型：电工/高处安装维护
    
    var user = users.find(function(u) { return u.username === username; });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ success: false, message: '用户名或密码错误' });
    }
    
    // 验证题库选择（如果没有传题库则跳过验证，允许先登录后选择）
    if (workType) {
      var validBank = questionBanks.find(function(b) { return b.work_type === workType; });
      if (!validBank) {
        return res.json({ success: false, message: '选择的题库无效' });
      }
      req.session.workType = workType; // 保存用户选择的题库
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json({ success: true, username: user.username, workType: workType || req.session.workType });
  } catch (err) {
    res.json({ success: false, message: '登录失败' });
  }
});

app.post('/api/logout', function(req, res) {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', function(req, res) {
  if (req.session.userId) {
    res.json({ 
      loggedIn: true, 
      username: req.session.username,
      workType: req.session.workType 
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.get('/api/questions', function(req, res) {
  var count = req.query.count || 50;
  var mode = req.query.mode || 'exam';
  var workType = req.session.workType; // 从 session 获取用户选择的题库
  
  // 根据题库过滤题目
  var filteredQuestions = questions;
  if (workType) {
    filteredQuestions = questions.filter(function(q) { return q.work_type === workType; });
  }
  
  if (filteredQuestions.length === 0) {
    return res.json({ success: false, message: '题库为空，请先导入题库' });
  }
  
  // 随机打乱函数
  function shuffle(arr) {
    return arr.slice().sort(function() { return Math.random() - 0.5; });
  }
  
  // 只有考试模式随机选题，背题和练习按顺序
  var selected;
  if (mode === 'exam') {
    // 考试随机抽100题：单选题60、多选20、判断20（如果没有足够的多选就都用单选判断）
    var single = filteredQuestions.filter(function(q) { return q.question_type === '单选题'; });
    var multi = filteredQuestions.filter(function(q) { return q.question_type === '多选题'; });
    var judge = filteredQuestions.filter(function(q) { return q.question_type === '判断题'; });
    
    // 根据实际题量调整抽题数量
    var selectedSingle = shuffle(single).slice(0, Math.min(60, single.length));
    var selectedMulti = shuffle(multi).slice(0, Math.min(20, multi.length));
    var selectedJudge = shuffle(judge).slice(0, Math.min(20, judge.length));
    
    // 如果某种类型不够，从其他类型补充
    var totalSelected = selectedSingle.length + selectedMulti.length + selectedJudge.length;
    while (totalSelected < 100 && (selectedSingle.length < single.length || selectedMulti.length < multi.length || selectedJudge.length < judge.length)) {
      if (selectedSingle.length < single.length) {
        selectedSingle.push(single[selectedSingle.length]);
      }
      if (selectedMulti.length < multi.length) {
        selectedMulti.push(multi[selectedMulti.length]);
      }
      if (selectedJudge.length < judge.length) {
        selectedJudge.push(judge[selectedJudge.length]);
      }
      totalSelected = selectedSingle.length + selectedMulti.length + selectedJudge.length;
    }
    
    // 合并并打乱顺序
    selected = shuffle(selectedSingle.concat(selectedMulti, selectedJudge));
  } else {
    // 练习/背题模式：按顺序返回
    selected = filteredQuestions.slice(0, parseInt(count));
  }
  
  selected = selected.map(function(q) {
    var data = {
      id: q.id,
      question_type: q.question_type,
      content: q.content,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      work_type: q.work_type  // 返回题库类型
    };
    // 背题模式和练习模式返回答案（练习需要即时反馈）
    if (mode === 'review' || mode === 'practice') {
      data.answer = q.answer;
    }
    return data;
  });
  
  res.json({ success: true, questions: selected });
});

app.post("/api/submit", function(req, res) {
  if (!req.session.userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  var answers = req.body.answers;
  var userId = req.session.userId;
  
  var correctCount = 0;
  var wrongCount = 0;
  
  for (var qId in answers) {
    var userAnswer = answers[qId];
    var question = questions.find(function(q) { return q.id == qId; });
    if (!question) continue;
    
    var userAns = Array.isArray(userAnswer) ? userAnswer.join('') : userAnswer;
    // 对多选题排序后比较，避免顺序问题导致误判
    var correctSorted = question.answer ? question.answer.toUpperCase().split('').sort().join('') : '';
    var userSorted = userAns ? userAns.toUpperCase().split('').sort().join('') : '';
    var isCorrect = userSorted && userSorted === correctSorted;
    
    if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
      wrongQuestions.push({
        id: Date.now() + Math.random(),
        user_id: userId,
        question_id: question.id,
        user_answer: userAns || '',
        created_at: new Date().toISOString()
      });
    }
  }
  
  var total = correctCount + wrongCount;
  var examMode = req.body.examMode === true;
  
  if (examMode) {
    // 考试模式：按100道题计算得分（不管做了多少道）
    // 5道对4道 = 4分，50道对40道 = 40分，100道对80道 = 80分
    score = Math.round((correctCount / 100) * 100);
  } else {
    // 练习模式：按实际做题数计算
    score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  }
  
  records.push({
    id: Date.now(),
    user_id: userId,
    total_questions: total,
    correct_count: correctCount,
    wrong_count: wrongCount,
    score: score,
    exam_time: total * 30,
    created_at: new Date().toISOString()
  });
  
  saveJson(recordsFile, records);
  saveJson(wrongFile, wrongQuestions);
  
  res.json({ success: true, correctCount: correctCount, wrongCount: wrongCount, score: score, total: total });
});

// 获取答题历史（/api/history）
app.get('/api/history', function(req, res) {
  if (!req.session.userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  var userRecords = records
    .filter(function(r) { return r.user_id === req.session.userId; })
    .sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  
  res.json({ success: true, history: userRecords });
});

app.get('/api/records', function(req, res) {
  if (!req.session.userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  var userRecords = records
    .filter(function(r) { return r.user_id === req.session.userId; })
    .sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); })
    .slice(0, 20);
  
  res.json({ success: true, records: userRecords });
});

app.get('/api/wrong', function(req, res) {
  if (!req.session.userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  var userWrong = wrongQuestions
    .filter(function(w) { return w.user_id === req.session.userId; })
    .sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  
  var result = userWrong.map(function(w) {
    var q = questions.find(function(q) { return q.id == w.question_id; });
    return {
      wrong_id: w.id,
      user_answer: w.user_answer,
      created_at: w.created_at,
      id: q ? q.id : null,
      content: q ? q.content : null,
      option_a: q ? q.option_a : null,
      option_b: q ? q.option_b : null,
      option_c: q ? q.option_c : null,
      option_d: q ? q.option_d : null,
      answer: q ? q.answer : null
    };
  }).filter(function(r) { return r.content; });
  
  res.json({ success: true, wrongQuestions: result });
});

app.delete('/api/wrong', function(req, res) {
  if (!req.session.userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  wrongQuestions = wrongQuestions.filter(function(w) { return w.user_id !== req.session.userId; });
  saveJson(wrongFile, wrongQuestions);
  res.json({ success: true });
});

app.get('/api/stats', function(req, res) {
  if (!req.session.userId) {
    return res.json({ success: false, message: '请先登录' });
  }
  
  var userRecords = records.filter(function(r) { return r.user_id === req.session.userId; });
  var userWrong = wrongQuestions.filter(function(w) { return w.user_id === req.session.userId; });
  
  var stats = {
    total_exams: userRecords.length,
    avg_score: userRecords.length > 0 
      ? userRecords.reduce(function(sum, r) { return sum + r.score; }, 0) / userRecords.length 
      : 0,
    best_score: userRecords.length > 0 
      ? Math.max.apply(null, userRecords.map(function(r) { return r.score; })) 
      : 0,
    total_correct: userRecords.reduce(function(sum, r) { return sum + r.correct_count; }, 0),
    total_wrong: userRecords.reduce(function(sum, r) { return sum + r.wrong_count; }, 0),
    wrong_count: userWrong.length
  };
  
  res.json({ success: true, stats: stats });
});

app.listen(PORT, function() {
  console.log('========================================');
  console.log('  答题系统已启动!');
  console.log('  访问地址: http://localhost:' + PORT);
  console.log('  题库数量: ' + questions.length + ' 道');
  console.log('========================================');
});
