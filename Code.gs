const CONFIG = {
  SPREADSHEET_ID: '1iqIynynW-R2OAFk2uAdLudWP1Y0xfY_por7FeN3NwCc'
};

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'dashboard');
    let payload;
    if (action === 'dashboard') payload = { students: getStudents_() };
    else if (action === 'studentWorkspace') payload = getStudentWorkspace_(String(e.parameter.studentId || ''));
    else throw new Error('Unknown action');
    return json_(payload);
  } catch (err) {
    return json_({ error: String(err.message || err) });
  }
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss_(){ return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }

function getStudents_(){
  const sh=ss_().getSheetByName('Students');
  if(!sh || sh.getLastRow()<2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,10).getValues()
    .map(r=>({studentId:String(r[0]||''),name:String(r[1]||''),email:String(r[2]||''),program:String(r[3]||''),title:String(r[4]||''),caseStudy:String(r[5]||''),stage:String(r[6]||'Proposal'),progress:Number(r[7])||0,status:String(r[8]||'Active'),lastActivity:format_(r[9])}))
    .filter(s=>s.studentId && s.name);
}

function getStudentWorkspace_(studentId){
  if(!studentId) throw new Error('StudentID is required');
  const student=getStudents_().find(s=>s.studentId===studentId);
  if(!student) throw new Error('Student not found');
  return {student,submissions:getRows_('Submissions',studentId),reviews:getRows_('Reviews',studentId),milestones:getRows_('Milestones',studentId)};
}

function getRows_(sheetName,studentId){
  const sh=ss_().getSheetByName(sheetName); if(!sh || sh.getLastRow()<2) return [];
  const rows=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
  if(sheetName==='Submissions') return rows.filter(r=>String(r[1])===studentId).map(r=>({submissionId:String(r[0]||''),studentId:String(r[1]||''),version:r[2]||'',fileName:String(r[3]||''),driveFileId:String(r[4]||''),part:String(r[5]||''),submittedAt:format_(r[6]),score:r[7]||'',decision:String(r[8]||'')}));
  if(sheetName==='Reviews') return rows.filter(r=>String(r[1])===studentId).map(r=>({reviewId:String(r[0]||''),studentId:String(r[1]||''),submissionId:String(r[2]||''),part:String(r[3]||''),score:r[4]||'',strengths:String(r[5]||''),majorNotes:String(r[6]||''),minorNotes:String(r[7]||''),feedback:String(r[8]||''),decision:String(r[9]||''),reviewedAt:format_(r[10])}));
  if(sheetName==='Milestones') return rows.filter(r=>String(r[1])===studentId).map(r=>({milestoneId:String(r[0]||''),studentId:String(r[1]||''),milestone:String(r[2]||''),targetDate:format_(r[3]),status:String(r[4]||''),updatedAt:format_(r[5])}));
  return [];
}
function format_(v){ if(!v)return ''; return v instanceof Date ? Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss') : String(v); }
