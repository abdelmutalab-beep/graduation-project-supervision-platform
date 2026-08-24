const CONFIG = {
  SPREADSHEET_ID: '1iqIynynW-R2OAFk2uAdLudWP1Y0xfY_por7FeN3NwCc',
  ROOT_FOLDER_ID: '1A9aN1qjEbhYHYnY_yqk2shFG4p1bnOem'
};


/* =========================================================
   WEB APP
========================================================= */

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Graduation Project Supervision Platform');
}


/* =========================================================
   CORE CONNECTIONS
========================================================= */

function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}


function getRootFolder() {
  return DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
}


/* =========================================================
   HELPERS
========================================================= */

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);

  if (!sh) {
    sh = ss.insertSheet(name);
  }

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold');

    sh.setFrozenRows(1);
  }

  return sh;
}


function formatDateForClient_(value) {
  if (!value) return '';

  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd HH:mm:ss'
    );
  }

  return String(value);
}



/* =========================================================
   ACCESS CONTROL / USER ROLES
========================================================= */

function getCurrentUserContext() {
  const email = String(Session.getActiveUser().getEmail() || '')
    .trim()
    .toLowerCase();

  if (!email) {
    return {
      authorized: false,
      role: 'Unauthorized',
      email: '',
      studentId: ''
    };
  }

  const sh = getSpreadsheet().getSheetByName('Users');

  if (!sh || sh.getLastRow() < 2) {
    return {
      authorized: false,
      role: 'Unauthorized',
      email: email,
      studentId: ''
    };
  }

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, 4)
    .getValues();

  for (let i = 0; i < rows.length; i++) {
    const userEmail = String(rows[i][0] || '').trim().toLowerCase();
    const role = String(rows[i][1] || '').trim();
    const studentId = String(rows[i][2] || '').trim();
    const activeValue = String(rows[i][3] || '').trim().toLowerCase();

    const active =
      activeValue === 'true' ||
      activeValue === 'yes' ||
      activeValue === 'active' ||
      activeValue === '1';

    if (userEmail === email && active) {
      if (role !== 'Supervisor' && role !== 'Student') {
        return {
          authorized: false,
          role: 'Unauthorized',
          email: email,
          studentId: ''
        };
      }

      if (role === 'Student' && !studentId) {
        return {
          authorized: false,
          role: 'Unauthorized',
          email: email,
          studentId: ''
        };
      }

      return {
        authorized: true,
        email: email,
        role: role,
        studentId: studentId
      };
    }
  }

  return {
    authorized: false,
    role: 'Unauthorized',
    email: email,
    studentId: ''
  };
}


function requireAuthorizedUser_() {
  const ctx = getCurrentUserContext();

  if (!ctx.authorized) {
    throw new Error('UNAUTHORIZED: This Google account is not authorized to use the platform.');
  }

  return ctx;
}


function requireSupervisor_() {
  const ctx = requireAuthorizedUser_();

  if (ctx.role !== 'Supervisor') {
    throw new Error('FORBIDDEN: Supervisor access is required.');
  }

  return ctx;
}


function assertStudentAccess_(studentId) {
  const ctx = requireAuthorizedUser_();
  const requestedId = String(studentId || '').trim();

  if (!requestedId) {
    throw new Error('StudentID is required');
  }

  if (ctx.role === 'Supervisor') {
    return ctx;
  }

  if (ctx.role === 'Student' && String(ctx.studentId) === requestedId) {
    return ctx;
  }

  throw new Error('FORBIDDEN: You cannot access another student record.');
}


/* =========================================================
   INITIALIZE WORKSPACE
========================================================= */

function initializeWorkspace() {
  const ss = getSpreadsheet();

  ensureSheet_(ss, 'Students', [
    'StudentID',
    'Name',
    'Email',
    'Program',
    'ProjectTitle',
    'CaseStudy',
    'Stage',
    'Progress',
    'Status',
    'LastActivity'
  ]);

  ensureSheet_(ss, 'Submissions', [
    'SubmissionID',
    'StudentID',
    'Version',
    'FileName',
    'DriveFileID',
    'Part',
    'SubmittedAt',
    'Score',
    'Decision'
  ]);

  ensureSheet_(ss, 'Reviews', [
    'ReviewID',
    'StudentID',
    'SubmissionID',
    'Part',
    'Score',
    'Strengths',
    'MajorNotes',
    'MinorNotes',
    'Feedback',
    'SupervisorDecision',
    'ReviewedAt'
  ]);

  ensureSheet_(ss, 'Milestones', [
    'MilestoneID',
    'StudentID',
    'Milestone',
    'TargetDate',
    'Status',
    'UpdatedAt'
  ]);

  ensureSheet_(ss, 'Users', [
    'Email',
    'Role',
    'StudentID',
    'Active'
  ]);

  initializeDriveFolders_();

  return {
    success: true,
    message: 'Workspace initialized successfully'
  };
}


/* =========================================================
   DRIVE FOLDERS
========================================================= */

function initializeDriveFolders_() {
  const root = getRootFolder();
  const ss = getSpreadsheet();
  const sh = ss.getSheetByName('Students');

  if (!sh || sh.getLastRow() < 2) {
    return 'No students yet';
  }

  const values = sh
    .getRange(
      2,
      1,
      sh.getLastRow() - 1,
      sh.getLastColumn()
    )
    .getValues();

  values.forEach(row => {
    const studentId = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();

    if (!studentId && !name) return;

    const folderName =
      (studentId ? studentId + ' - ' : '') + name;

    const existing = root.getFoldersByName(folderName);

    const studentFolder = existing.hasNext()
      ? existing.next()
      : root.createFolder(folderName);

    const folders = [
      '01 Proposal',
      '02 Chapter 1',
      '03 Chapter 2',
      '04 Chapter 3',
      '05 Data Collection',
      '06 Chapter 4',
      '07 Chapter 5',
      '08 Final Review'
    ];

    folders.forEach(subFolderName => {
      const existingSubFolder =
        studentFolder.getFoldersByName(subFolderName);

      if (!existingSubFolder.hasNext()) {
        studentFolder.createFolder(subFolderName);
      }
    });
  });

  return 'Drive folders checked successfully';
}


function createStudentFolders() {
  return initializeDriveFolders_();
}


/* =========================================================
   STUDENTS
========================================================= */

function getStudents() {
  const ctx = requireAuthorizedUser_();
  const ss = getSpreadsheet();
  const sh = ss.getSheetByName('Students');

  if (!sh || sh.getLastRow() < 2) {
    return [];
  }

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, 10)
    .getValues();

  const mapped = rows.map(row => ({
    studentId: String(row[0] || ''),
    name: String(row[1] || ''),
    email: String(row[2] || ''),
    program: String(row[3] || ''),
    title: String(row[4] || ''),
    caseStudy: String(row[5] || ''),
    stage: String(row[6] || ''),
    progress: Number(row[7]) || 0,
    status: String(row[8] || ''),
    lastActivity: formatDateForClient_(row[9])
  }));

  if (ctx.role === 'Student') {
    return mapped.filter(
      student => String(student.studentId) === String(ctx.studentId)
    );
  }

  return mapped;
}


function saveStudent(student) {
  requireSupervisor_();
  if (!student) {
    throw new Error('Student data is required');
  }

  const id = String(student.studentId || '').trim();

  if (!id) {
    throw new Error('StudentID is required');
  }

  const sh = getSpreadsheet().getSheetByName('Students');

  if (!sh) {
    throw new Error('Students sheet not found');
  }

  const data = sh.getDataRange().getValues();

  let targetRow = -1;

  for (let i = 1; i < data.length; i++) {
    const existingId =
      String(data[i][0] || '').trim();

    if (existingId === id) {
      targetRow = i + 1;
      break;
    }
  }

  const row = [
    id,
    student.name || '',
    student.email || '',
    student.program || '',
    student.title || '',
    student.caseStudy || '',
    student.stage || '',
    Number(student.progress) || 0,
    student.status || 'Active',
    new Date()
  ];

  if (targetRow > 0) {
    sh.getRange(
      targetRow,
      1,
      1,
      row.length
    ).setValues([row]);

  } else {
    sh.appendRow(row);
  }

  return {
    success: true,
    studentId: id
  };
}


/* =========================================================
   REVIEWS & SUPERVISOR NOTES
========================================================= */

function saveNote(note) {
  requireSupervisor_();
  if (!note) {
    throw new Error('Note data is required');
  }

  const studentId =
    String(note.studentId || '').trim();

  if (!studentId) {
    throw new Error('StudentID is required');
  }

  const sh = getSpreadsheet().getSheetByName('Reviews');

  if (!sh) {
    throw new Error('Reviews sheet not found');
  }

  const reviewId = Utilities.getUuid();

  sh.appendRow([
    reviewId,
    studentId,
    note.submissionId || '',
    note.section || 'General',
    note.score || '',
    note.strengths || '',
    note.majorNotes || '',
    note.minorNotes || '',
    note.text || '',
    note.decision || '',
    new Date()
  ]);

  return {
    success: true,
    reviewId: reviewId
  };
}


/* =========================================================
   MILESTONES
========================================================= */

function saveMilestone(item) {
  requireSupervisor_();
  if (!item) {
    throw new Error('Milestone data is required');
  }

  const studentId =
    String(item.studentId || '').trim();

  if (!studentId) {
    throw new Error('StudentID is required');
  }

  const sh =
    getSpreadsheet().getSheetByName('Milestones');

  if (!sh) {
    throw new Error('Milestones sheet not found');
  }

  const milestoneId = Utilities.getUuid();

  sh.appendRow([
    milestoneId,
    studentId,
    item.name || '',
    item.date || '',
    item.status || 'Pending',
    new Date()
  ]);

  return {
    success: true,
    milestoneId: milestoneId
  };
}


/* =========================================================
   FOLLOW-UP
========================================================= */

function saveFollowup(item) {
  requireSupervisor_();
  if (!item) {
    throw new Error('Follow-up data is required');
  }

  const studentId =
    String(item.studentId || '').trim();

  if (!studentId) {
    throw new Error('StudentID is required');
  }

  const sh =
    getSpreadsheet().getSheetByName('Milestones');

  if (!sh) {
    throw new Error('Milestones sheet not found');
  }

  const milestoneId = Utilities.getUuid();

  sh.appendRow([
    milestoneId,
    studentId,
    'FOLLOWUP: ' + (item.type || 'Follow-up'),
    item.date || '',
    'Scheduled',
    new Date()
  ]);

  return {
    success: true,
    milestoneId: milestoneId
  };
}


/* =========================================================
   DASHBOARD
========================================================= */

function getDashboardData() {
  return {
    students: getStudents(),
    generatedAt: new Date().toISOString()
  };
}


/* =========================================================
   TEST FUNCTIONS
========================================================= */

function testDashboardData() {
  const data = getDashboardData();

  Logger.log(JSON.stringify(data, null, 2));

  return data;
}


function testSaveNote() {
  const result = saveNote({
    studentId: 'ST001',
    section: 'Chapter 1',
    text: 'Test supervisor note'
  });

  Logger.log(JSON.stringify(result));

  return result;
}function getReviews(studentId) {
  assertStudentAccess_(studentId);
  const sh = getSpreadsheet().getSheetByName('Reviews');

  if (!sh || sh.getLastRow() < 2) return [];

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, 11)
    .getValues();

  return rows
    .filter(r => String(r[1] || '').trim() === String(studentId || '').trim())
    .map(r => ({
      reviewId: String(r[0] || ''),
      studentId: String(r[1] || ''),
      submissionId: String(r[2] || ''),
      part: String(r[3] || ''),
      score: r[4] || '',
      strengths: String(r[5] || ''),
      majorNotes: String(r[6] || ''),
      minorNotes: String(r[7] || ''),
      feedback: String(r[8] || ''),
      decision: String(r[9] || ''),
      reviewedAt: formatDateForClient_(r[10])
    }));
}


function getSubmissions(studentId) {
  assertStudentAccess_(studentId);
  const sh = getSpreadsheet().getSheetByName('Submissions');

  if (!sh || sh.getLastRow() < 2) return [];

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, 9)
    .getValues();

  return rows
    .filter(r => String(r[1] || '').trim() === String(studentId || '').trim())
    .map(r => ({
      submissionId: String(r[0] || ''),
      studentId: String(r[1] || ''),
      version: r[2] || '',
      fileName: String(r[3] || ''),
      driveFileId: String(r[4] || ''),
      part: String(r[5] || ''),
      submittedAt: formatDateForClient_(r[6]),
      score: r[7] || '',
      decision: String(r[8] || '')
    }));
}


function getMilestones(studentId) {
  assertStudentAccess_(studentId);
  const sh = getSpreadsheet().getSheetByName('Milestones');

  if (!sh || sh.getLastRow() < 2) return [];

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, 6)
    .getValues();

  return rows
    .filter(r => String(r[1] || '').trim() === String(studentId || '').trim())
    .map(r => ({
      milestoneId: String(r[0] || ''),
      studentId: String(r[1] || ''),
      milestone: String(r[2] || ''),
      targetDate: formatDateForClient_(r[3]),
      status: String(r[4] || ''),
      updatedAt: formatDateForClient_(r[5])
    }));
}


function getStudentWorkspace(studentId) {
  assertStudentAccess_(studentId);
  return {
    reviews: getReviews(studentId),
    submissions: getSubmissions(studentId),
    milestones: getMilestones(studentId)
  };
}function getStudentFolder_(studentId, studentName) {
  const root = getRootFolder();

  const folderName =
    (studentId ? studentId + ' - ' : '') +
    (studentName || 'Student');

  const folders = root.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return root.createFolder(folderName);
}


function getSubmissionFolder_(studentFolder, part) {
  const map = {
    'Proposal': '01 Proposal',
    'Chapter 1': '02 Chapter 1',
    'Chapter 2': '03 Chapter 2',
    'Chapter 3': '04 Chapter 3',
    'Data Collection': '05 Data Collection',
    'Chapter 4': '06 Chapter 4',
    'Chapter 5': '07 Chapter 5',
    'Abstract': '08 Final Review',
    'References': '08 Final Review',
    'Formatting': '08 Final Review',
    'Full Review': '08 Final Review'
  };

  const folderName = map[part] || '08 Final Review';

  const folders = studentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return studentFolder.createFolder(folderName);
}


function getNextVersion_(studentId, part) {
  const sh = getSpreadsheet().getSheetByName('Submissions');

  if (!sh || sh.getLastRow() < 2) {
    return 1;
  }

  const values = sh
    .getRange(2, 1, sh.getLastRow() - 1, 9)
    .getValues();

  const matching = values.filter(row =>
    String(row[1] || '').trim() === String(studentId || '').trim() &&
    String(row[5] || '').trim() === String(part || '').trim()
  );

  return matching.length + 1;
}


function uploadSubmission(payload) {
  const currentUser = requireAuthorizedUser_();
  if (!payload) {
    throw new Error('Submission data is required');
  }

  const studentId = String(payload.studentId || '').trim();
  const studentName = String(payload.studentName || '').trim();
  const fileName = String(payload.fileName || '').trim();
  const part = String(payload.part || 'Full Review').trim();

  if (
    currentUser.role === 'Student' &&
    String(currentUser.studentId) !== String(studentId)
  ) {
    throw new Error('FORBIDDEN: Students can upload only to their own project.');
  }

  if (!studentId) {
    throw new Error('StudentID is required');
  }

  if (!fileName) {
    throw new Error('File name is required');
  }

  if (!payload.base64) {
    throw new Error('File content is required');
  }

  const studentFolder =
    getStudentFolder_(studentId, studentName);

  const targetFolder =
    getSubmissionFolder_(studentFolder, part);

  const version =
    getNextVersion_(studentId, part);

  const extension =
    fileName.includes('.')
      ? '.' + fileName.split('.').pop()
      : '';

  const cleanName =
    extension
      ? fileName.slice(0, -extension.length)
      : fileName;

  const storedFileName =
    cleanName +
    '_V' +
    version +
    extension;

  const bytes =
    Utilities.base64Decode(payload.base64);

  const blob =
    Utilities.newBlob(
      bytes,
      payload.mimeType || 'application/octet-stream',
      storedFileName
    );

  const driveFile =
    targetFolder.createFile(blob);

  const submissionId =
    Utilities.getUuid();

  const sh =
    getSpreadsheet().getSheetByName('Submissions');

  sh.appendRow([
    submissionId,
    studentId,
    version,
    storedFileName,
    driveFile.getId(),
    part,
    new Date(),
    '',
    'بانتظار المراجعة'
  ]);

  return {
    success: true,
    submissionId: submissionId,
    version: version,
    fileName: storedFileName,
    fileId: driveFile.getId(),
    fileUrl: driveFile.getUrl()
  };
}function testOpenAIConnection() {
  const apiKey =
    PropertiesService
      .getScriptProperties()
      .getProperty('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY was not found in Script Properties'
    );
  }

  const payload = {
    model: 'gpt-5.6-terra',
    input: 'Reply with exactly: AI CONNECTION OK'
  };

  const response = UrlFetchApp.fetch(
    'https://api.openai.com/v1/responses',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  Logger.log(
    'HTTP ' + status
  );

  Logger.log(body);

  if (status < 200 || status >= 300) {
    throw new Error(
      'OpenAI API error: ' + body
    );
  }

  return body;
}function reviewSubmissionWithAI(payload) {
  requireSupervisor_();
  if (!payload || !payload.text) {
    throw new Error('Review text is required');
  }

  const apiKey = PropertiesService
    .getScriptProperties()
    .getProperty('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found');
  }

  const part = String(payload.part || 'Full Review');
  const studentText = String(payload.text || '').slice(0, 100000);

  const guide = `
You are an academic research reviewer for graduation projects at
Sudan University of Science and Technology.

Evaluate ONLY against the following institutional requirements.

CHAPTER 1:
Background/introduction, problem statement, research questions,
research objectives, hypotheses if applicable, scope, significance,
motivation and related information.
Harvard in-text referencing is NOT a mandatory standalone requirement for Chapter 1.
Do not reduce the Chapter 1 score merely because Harvard citations are absent.

CHAPTER 2:
Conceptual/theoretical framework, theories explaining the phenomenon,
variables, previous studies and a clearly identified research gap.

CHAPTER 3:
Research design, methodology, study population, sampling method and size,
data collection tools, validity/quality of tools, data collection procedures,
and statistical/data-analysis methods.

CHAPTER 4:
Presentation of qualitative/quantitative data, descriptive/statistical
analysis, validation of tools where applicable, hypothesis testing where
applicable, interpretation and discussion of results.

CHAPTER 5:
Study conclusions and recommendations, with recommendations supported
by the actual study findings.

ABSTRACT:
One concise paragraph; objective, problem, methodology, major results
and recommendations; no citations or bullet points; maximum about 300 words.

REFERENCING:
Harvard author-year system. In-text citations and reference list should
be consistent. Direct quotations must not exceed 15 percent of the text.

TABLES AND FIGURES:
Numbered according to chapter and sequence. Tables require appropriate
titles; figures must be clear and high quality. Sources must be shown
when material is taken from another source.

FORMATTING:
Arabic: Simplified Arabic 14.
English: Times New Roman 12.
Preliminary pages use lowercase Roman numbering; main text begins with
Arabic page number 1.

IMPORTANT:
Do not invent missing information.
If the supplied text is insufficient to judge a criterion, mark it
"Not assessable from submitted text".
The AI recommendation is advisory only; final approval belongs to the supervisor.
`;

  const prompt = `
PART UNDER REVIEW:
${part}

STUDENT SUBMISSION:
--------------------
${studentText}
--------------------

Evaluate the work academically.
If PART UNDER REVIEW is Chapter 1, do not penalize the submission for the absence of Harvard citations and state that Harvard referencing is not a mandatory standalone criterion for this chapter.

Return:
1. overall_score from 0 to 100
2. compliance_level
3. structure_score
4. academic_quality_score
5. evidence_and_referencing_score
6. coherence_score
7. strengths
8. major_issues
9. minor_issues
10. missing_requirements
11. research_consistency
12. harvard_referencing
13. required_revisions
14. student_feedback
15. supervisor_recommendation

Write the feedback in Arabic unless the submitted work is primarily English.
Be specific and concise.
`;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      overall_score: { type: "number" },
      compliance_level: { type: "string" },
      structure_score: { type: "number" },
      academic_quality_score: { type: "number" },
      evidence_and_referencing_score: { type: "number" },
      coherence_score: { type: "number" },

      strengths: {
        type: "array",
        items: { type: "string" }
      },

      major_issues: {
        type: "array",
        items: { type: "string" }
      },

      minor_issues: {
        type: "array",
        items: { type: "string" }
      },

      missing_requirements: {
        type: "array",
        items: { type: "string" }
      },

      research_consistency: {
        type: "array",
        items: { type: "string" }
      },

      harvard_referencing: {
        type: "string"
      },

      required_revisions: {
        type: "array",
        items: { type: "string" }
      },

      student_feedback: {
        type: "string"
      },

      supervisor_recommendation: {
        type: "string"
      }
    },

    required: [
      "overall_score",
      "compliance_level",
      "structure_score",
      "academic_quality_score",
      "evidence_and_referencing_score",
      "coherence_score",
      "strengths",
      "major_issues",
      "minor_issues",
      "missing_requirements",
      "research_consistency",
      "harvard_referencing",
      "required_revisions",
      "student_feedback",
      "supervisor_recommendation"
    ]
  };

  const requestBody = {
    model: 'gpt-5.6-terra',

    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: guide
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt
          }
        ]
      }
    ],

    text: {
      format: {
        type: 'json_schema',
        name: 'academic_review',
        strict: true,
        schema: schema
      }
    }
  };

  const response = UrlFetchApp.fetch(
    'https://api.openai.com/v1/responses',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + apiKey
      },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error(
      'OpenAI API error HTTP ' +
      status +
      ': ' +
      body
    );
  }

  const data = JSON.parse(body);

  let outputText = '';

  if (data.output) {
    data.output.forEach(item => {
      if (item.content) {
        item.content.forEach(content => {
          if (content.type === 'output_text' && content.text) {
            outputText += content.text;
          }
        });
      }
    });
  }

  if (!outputText) {
    throw new Error('No review returned by AI');
  }

  const review = JSON.parse(outputText);

  return {
    success: true,
    part: part,
    review: review
  };
}function testAcademicAIReview() {
  const result = reviewSubmissionWithAI({
    part: 'Chapter 1',

    text: `
مشكلة الدراسة تتمثل في ضعف تطبيق ممارسات إدارة الجودة الشاملة.
تهدف الدراسة إلى تقييم مستوى التطبيق وتحديد أبرز المعوقات.
تسعى الدراسة للإجابة عن سؤال رئيس يتعلق بمستوى تطبيق الجودة.
تكمن أهمية الدراسة في تقديم توصيات لتحسين الأداء.
`
  });

  Logger.log(JSON.stringify(result, null, 2));
}



function findSubmissionByFileId_(fileId) {
  const sh = getSpreadsheet().getSheetByName('Submissions');

  if (!sh || sh.getLastRow() < 2) {
    return null;
  }

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, 9)
    .getValues();

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][4] || '').trim() === String(fileId || '').trim()) {
      return {
        submissionId: String(rows[i][0] || ''),
        studentId: String(rows[i][1] || ''),
        fileId: String(rows[i][4] || ''),
        part: String(rows[i][5] || '')
      };
    }
  }

  return null;
}


function assertFileAccess_(fileId) {
  const ctx = requireAuthorizedUser_();
  const submission = findSubmissionByFileId_(fileId);

  if (!submission) {
    throw new Error('FORBIDDEN: File is not registered in Submissions.');
  }

  if (
    ctx.role === 'Student' &&
    String(ctx.studentId) !== String(submission.studentId)
  ) {
    throw new Error('FORBIDDEN: You cannot access another student file.');
  }

  return {
    context: ctx,
    submission: submission
  };
}


/* =========================================================
   FILE TEXT EXTRACTION
   Requires Advanced Google Service: Drive API
========================================================= */

function extractSubmissionText(payload) {
  if (payload && payload.fileId) assertFileAccess_(payload.fileId);
  if (!payload || !payload.fileId) {
    throw new Error('Drive File ID is required');
  }

  const fileId = String(payload.fileId || '').trim();
  const file = DriveApp.getFileById(fileId);
  const fileName = String(payload.fileName || file.getName() || '').trim();
  const lowerName = fileName.toLowerCase();
  const mimeType = file.getMimeType();

  if (mimeType === MimeType.GOOGLE_DOCS) {
    return {
      success: true,
      fileId: fileId,
      fileName: fileName,
      sourceType: 'Google Docs',
      text: DocumentApp.openById(fileId).getBody().getText()
    };
  }

  if (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.md') ||
    String(mimeType || '').indexOf('text/') === 0
  ) {
    return {
      success: true,
      fileId: fileId,
      fileName: fileName,
      sourceType: 'Text',
      text: file.getBlob().getDataAsString('UTF-8')
    };
  }

  if (
    lowerName.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractViaGoogleDocs_(file, 'DOCX');
  }

  if (
    lowerName.endsWith('.pdf') ||
    mimeType === MimeType.PDF ||
    mimeType === 'application/pdf'
  ) {
    return extractViaGoogleDocs_(file, 'PDF');
  }

  throw new Error('Unsupported file type: ' + fileName + ' / ' + mimeType);
}

function extractViaGoogleDocs_(file, sourceType) {
  if (typeof Drive === 'undefined' || !Drive.Files) {
    throw new Error('Advanced Drive Service is not enabled. In Apps Script open Services → + → Drive API → Add.');
  }

  const resource = {
    name: 'TEMP_EXTRACT_' + new Date().getTime() + '_' + file.getName(),
    mimeType: MimeType.GOOGLE_DOCS
  };

  let converted;

  try {
    converted = Drive.Files.create(
      resource,
      file.getBlob(),
      { fields: 'id,name,mimeType' }
    );

    const text = readConvertedDocTextWithRetry_(converted.id);

    if (!text || !String(text).trim()) {
      throw new Error(
        sourceType === 'PDF'
          ? 'No readable text was extracted from the PDF. If the PDF is scanned/image-only, convert it to a searchable PDF or Google Doc first.'
          : 'No readable text was extracted from the DOCX file.'
      );
    }

    return {
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      sourceType: sourceType,
      convertedFileId: converted.id,
      text: String(text)
    };

  } finally {
    if (converted && converted.id) {
      try {
        DriveApp.getFileById(converted.id).setTrashed(true);
      } catch (cleanupError) {
        console.warn('Temporary extraction file cleanup failed: ' + cleanupError.message);
      }
    }
  }
}

function readConvertedDocTextWithRetry_(docId) {
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const doc = DocumentApp.openById(docId);
      const text = doc.getBody().getText();
      if (text !== null && text !== undefined) return text;
    } catch (error) {
      lastError = error;
    }

    Utilities.sleep(700 * (attempt + 1));
  }

  if (lastError) throw lastError;
  return '';
}

/* =========================================================
   ONE-CLICK: EXTRACT + AI REVIEW
========================================================= */

function extractAndReviewSubmission(payload) {
  requireSupervisor_();
  if (!payload || !payload.fileId) {
    throw new Error('Drive File ID is required');
  }

  const extracted = extractSubmissionText({
    fileId: payload.fileId,
    fileName: payload.fileName || ''
  });

  const text = String(extracted.text || '').trim();

  if (!text) {
    throw new Error('The submission does not contain readable text');
  }

  const reviewResult = reviewSubmissionWithAI({
    part: payload.part || 'Full Review',
    text: text
  });

  return {
    success: true,
    extraction: {
      fileId: extracted.fileId || payload.fileId,
      fileName: extracted.fileName || payload.fileName || '',
      sourceType: extracted.sourceType || '',
      characters: text.length
    },
    part: reviewResult.part,
    review: reviewResult.review,
    text: text.slice(0, 120000)
  };
}

function testExtractSubmissionText() {
  throw new Error('Replace this test with a real Drive file ID, or test extraction from the Web App interface.');
}
