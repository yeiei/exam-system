const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');
const questionsFile = path.join(DATA_DIR, 'questions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 加载现有题库
let questions = [];
if (fs.existsSync(questionsFile)) {
  try {
    questions = JSON.parse(fs.readFileSync(questionsFile, 'utf8'));
  } catch (e) {
    questions = [];
  }
}

// 读取Excel
const workbook = XLSX.readFile('/home/yei/docs/监护人20260129.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

let count = 0;
for (const row of data) {
  const content = row['题干'];
  const answer = row['答案'];
  
  if (content && answer) {
    questions.push({
      id: Date.now() + count,
      question_type: row['题型'] || '单选题',
      content: content,
      score: row['分数'] || 1,
      answer: answer,
      option_a: row['选项A'] || '',
      option_b: row['选项B'] || '',
      option_c: row['选项C'] || '',
      option_d: row['选项D'] || '',
      option_e: row['选择E'] || '',
      work_type: row['工种名称'] || '监护人'
    });
    count++;
  }
}

fs.writeFileSync(questionsFile, JSON.stringify(questions, null, 2));
console.log(`成功导入 ${count} 道题目`);
console.log(`数据库共有 ${questions.length} 道题目`);
