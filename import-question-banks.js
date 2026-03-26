const fs = require('fs');
const path = require('path');
const openpyxl = require('openpyxl');

const DATA_DIR = path.join(__dirname, 'data');

// 题库配置
const QUESTION_BANKS = [
  {
    name: '电工',
    file: '/home/yei/docs/电工题库.xlsx',
    work_type: '电工'
  },
  {
    name: '高处安装维护',
    file: '/home/yei/docs/高处安装维护题库.xlsx',
    work_type: '高处安装维护'
  }
];

function importQuestions() {
  const allQuestions = [];
  const banks = [];
  
  for (const bank of QUESTION_BANKS) {
    console.log(`\n📚 导入题库: ${bank.name}`);
    
    const wb = openpyxl.loadWorkbook(bank.file);
    const ws = wb.active;
    
    let rowCount = 0;
    let skipCount = 0;
    
    // 跳过表头，从第2行开始
    for (let i = 2; i <= ws.max_row; i++) {
      const row = ws[i];
      if (!row || !row[2].value) continue; // 没有题干跳过
      
      const questionType = row[1]?.value || '单选题';
      
      // 过滤掉多选题
      if (questionType.includes('多选')) {
        skipCount++;
        continue;
      }
      
      const question = {
        id: Date.now() + Math.random() * 1000000,
        question_type: questionType,
        content: row[2]?.value || '',
        score: row[3]?.value || '1',
        answer: row[4]?.value || '',
        option_a: row[5]?.value || '',
        option_b: row[6]?.value || '',
        option_c: row[7]?.value || '',
        option_d: row[8]?.value || '',
        option_e: row[9]?.value || '',
        work_type: bank.work_type
      };
      
      // 处理判断题
      if (questionType === '判断题' && question.answer) {
        question.answer = question.answer.toString().replace('正确', 'A').replace('错误', 'B').replace('对', 'A').replace('错', 'B');
        if (!['A', 'B'].includes(question.answer)) {
          question.answer = question.answer === 'true' || question.answer === '是' || question.answer === '对' ? 'A' : 'B';
        }
      }
      
      allQuestions.push(question);
      rowCount++;
    }
    
    wb.close();
    
    banks.push({
      id: bank.work_type,
      name: bank.name,
      work_type: bank.work_type,
      question_count: rowCount
    });
    
    console.log(`  ✅ 导入 ${rowCount} 道题，跳过 ${skipCount} 道多选题`);
  }
  
  // 保存题库列表
  const banksFile = path.join(DATA_DIR, 'question_banks.json');
  fs.writeFileSync(banksFile, JSON.stringify(banks, null, 2));
  console.log(`\n📋 已保存题库列表到: ${banksFile}`);
  
  // 保存题目
  const questionsFile = path.join(DATA_DIR, 'questions.json');
  fs.writeFileSync(questionsFile, JSON.stringify(allQuestions, null, 2));
  console.log(`📝 已保存 ${allQuestions.length} 道题目到: ${questionsFile}`);
  
  console.log('\n✅ 导入完成！');
  console.log('\n题库列表:');
  for (const b of banks) {
    console.log(`  - ${b.name}: ${b.question_count} 道题`);
  }
}

importQuestions();
