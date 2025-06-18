let formData = {
    title: '',
    description: '',
    questions: []
};

let selectedQuestion = null;
let questionCounter = 0;

// File upload handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('drop', handleDrop);
uploadArea.addEventListener('dragleave', handleDragLeave);

fileInput.addEventListener('change', handleFileSelect);

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    if (!file.name.toLowerCase().endsWith('.json')) {
        showError('กรุณาเลือกไฟล์ .json เท่านั้น');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            parseFormsJSON(jsonData);
            showFileInfo(file);
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON: ' + error.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
}

function parseFormsJSON(jsonData) {
    // Parse metadata
    if (jsonData.metadata) {
        const meta = jsonData.metadata;
        
        formData.title = meta.title || '';
        document.getElementById('formTitle').value = formData.title;
        
        formData.description = meta.description || '';
        document.getElementById('formDescription').value = formData.description;
        
        // Update subtitle and metadata
        document.getElementById('formSubtitle').textContent = meta.date || '-';
        
        if (meta.date || meta.platform || meta.created_by) {
            document.getElementById('formMetadata').style.display = 'block';
            document.getElementById('metaDate').textContent = meta.date || '-';
            document.getElementById('metaPlatform').textContent = meta.platform || '-';
            document.getElementById('metaCreatedBy').textContent = meta.created_by || '-';
        }
    }

    // Parse questions
    if (jsonData.questions && Array.isArray(jsonData.questions)) {
        formData.questions = jsonData.questions.map(q => {
            // Map JSON types to internal types
            let type = 'text';
            switch (q.type) {
                case 'single_choice':
                    type = 'choice';
                    break;
                case 'multiple_choice':
                case 'checkbox':
                    type = 'checkbox';
                    break;
                case 'textarea':
                    type = 'textarea';
                    break;
                case 'text':
                default:
                    type = 'text';
                    break;
            }

            return {
                id: q.id || 'q' + Date.now() + Math.random(),
                number: q.number || 0,
                title: q.text || '',
                type: type,
                required: q.required || false,
                options: q.options || [],
                note: q.note || ''
            };
        });
    } else {
        formData.questions = [];
    }

    renderQuestions();
    updateStats();
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    
    if (formData.questions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>ยังไม่มีคำถาม</h3>
                <p>นำเข้าไฟล์ JSON หรือเพิ่มคำถามใหม่</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    formData.questions.forEach((question, index) => {
        const questionEl = createQuestionElement(question, index);
        container.appendChild(questionEl);
    });
}

function createQuestionElement(question, index) {
    const div = document.createElement('div');
    div.className = 'question-block';
    div.dataset.questionId = question.id;

    const typeLabels = {
        'text': 'ข้อความสั้น',
        'textarea': 'ข้อความยาว', 
        'choice': 'ตัวเลือกเดียว',
        'checkbox': 'หลายตัวเลือก'
    };

    let contentHTML = '';
    
    if (question.type === 'choice' || question.type === 'checkbox') {
        contentHTML = question.options.map(option => `
            <div class="choice-option">
                <div class="${question.type === 'choice' ? 'choice-radio' : 'choice-checkbox'}"></div>
                <input type="text" class="choice-text" value="${option}" readonly>
            </div>
        `).join('');
    } else {
        const placeholderText = question.type === 'textarea' ? 'ข้อความยาว...' : 'ข้อความสั้น...';
        contentHTML = `
            <div class="text-input-preview ${question.type === 'textarea' ? 'textarea-preview' : ''}">
                ${placeholderText}
            </div>
        `;
    }

    // Add note if exists
    let noteHTML = '';
    if (question.note && question.note.trim()) {
        noteHTML = `
            <div style="margin-top: 12px; padding: 8px 12px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; font-size: 13px; color: #856404;">
                💡 ${question.note}
            </div>
        `;
    }

    div.innerHTML = `
        <div class="question-header">
            <div class="drag-handle">⋮⋮</div>
            <div class="question-number">${question.number}.</div>
            <input type="text" class="question-title-input" value="${question.title}" readonly>
            <div class="question-type">${typeLabels[question.type]}</div>
            ${question.required ? '<span class="required-indicator">*</span>' : ''}
        </div>
        <div class="question-content">
            ${contentHTML}
            ${noteHTML}
        </div>
    `;

    // Add click handler
    div.addEventListener('click', () => selectQuestion(question.id));
    
    return div;
}

function selectQuestion(questionId) {
    // Remove previous selection
    document.querySelectorAll('.question-block').forEach(block => {
        block.classList.remove('selected');
    });

    // Add selection to clicked question
    const questionBlock = document.querySelector(`[data-question-id="${questionId}"]`);
    if (questionBlock) {
        questionBlock.classList.add('selected');
        selectedQuestion = questionId;
    }
}

function addNewQuestion() {
    questionCounter++;
    const newQuestion = {
        id: 'q' + Date.now() + Math.random(),
        number: formData.questions.length + 1,
        title: `คำถามใหม่ ${questionCounter}`,
        type: 'text',
        required: false,
        options: []
    };

    formData.questions.push(newQuestion);
    renderQuestions();
    updateStats();
    selectQuestion(newQuestion.id);
}

function updateStats() {
    document.getElementById('questionCount').textContent = formData.questions.length;
    document.getElementById('requiredCount').textContent = 
        formData.questions.filter(q => q.required).length;
}

function showFileInfo(file) {
    const questionsText = formData.questions.length === 1 ? 'คำถาม' : 'คำถาม';
    fileInfo.innerHTML = `
        <div class="file-info">
            ✅ นำเข้าไฟล์ JSON สำเร็จ: ${file.name} (${(file.size / 1024).toFixed(1)} KB)
            <br>📊 พบ ${formData.questions.length} ${questionsText}
            <br>📋 ฟอร์ม: ${formData.title || 'ไม่ระบุชื่อ'}
        </div>
    `;
}

function showError(message) {
    fileInfo.innerHTML = `
        <div class="error-message">
            ❌ ${message}
        </div>
    `;
}

// Event listeners
document.getElementById('addQuestionBtn').addEventListener('click', addNewQuestion);

document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);

function loadSampleData() {
    const sampleData = {
        "metadata": {
            "title": "แบบรับข้อร้องเรียน หรือข้อเสนอแนะการให้บริการ IDT",
            "date": "Jun 17, 2025",
            "description": "สำนักเทคโนโลยีดิจิทัลและสารสนเทศ สถานบันบัณฑิตพัฒนบริหารศาสตร์ ทุกข้อร้องเรียนหรือข้อเสนอแนะของท่าน จะได้รับการพิจารณาเพื่อปรับปรุงการบริการให้ดียิ่งขึ้น",
            "platform": "Microsoft Forms",
            "created_by": "สำนักเทคโนโลยีดิจิทัลและสารสนเทศ NIDA"
        },
        "questions": [
            {
                "id": "question_1",
                "number": 1,
                "text": "ผู้ร้องเรียนหรือผู้เสนอแนะ",
                "type": "single_choice",
                "required": true,
                "options": ["นักศึกษา", "เจ้าหน้าที่", "อาจารย์", "บุคคลภายนอก"]
            },
            {
                "id": "question_2",
                "number": 2,
                "text": "ชื่อ - นามสกุล",
                "type": "text",
                "required": true,
                "options": [],
                "note": "คำถามนี้จะใช้เพื่อส่งคำยืนยันให้แก่คุณเท่านั้น"
            },
            {
                "id": "question_3",
                "number": 3,
                "text": "คณะ/หน่วยงาน",
                "type": "text",
                "required": true,
                "options": []
            },
            {
                "id": "question_4",
                "number": 4,
                "text": "เบอร์โทรศัพท์",
                "type": "text",
                "required": true,
                "options": []
            },
            {
                "id": "question_5",
                "number": 5,
                "text": "อีเมล",
                "type": "text",
                "required": true,
                "options": []
            },
            {
                "id": "question_6",
                "number": 6,
                "text": "รายละเอียดข้อร้องเรียนหรือข้อเสนอแนะ",
                "type": "textarea",
                "required": true,
                "options": []
            },
            {
                "id": "question_7",
                "number": 7,
                "text": "ข้าพเจ้าตกลงยินยอมให้มีการเปิดเผยข้อมูลเกี่ยวกับข้อร้องเรียน คำชี้แจง รวมถึงเอกสารหลักฐานที่เกี่ยวข้อง แก่สำนักเทคโนโลยีดิจิทัลและสารสนเทศ สถาบันบัณฑิตพัฒนบริหารศาสตร์ เพื่อประกอบการพิจารณาข้อร้องเรียนหรือข้อเสนอแนะ",
                "type": "checkbox",
                "required": true,
                "options": ["ยินยอม"]
            }
        ]
    };

    parseFormsJSON(sampleData);
    fileInfo.innerHTML = `
        <div class="file-info">
            📋 โหลดข้อมูลตัวอย่างสำเร็จ
            <br>📊 พบ ${formData.questions.length} คำถาม
            <br>📋 ฟอร์ม: ${formData.title}
        </div>
    `;
}

document.querySelectorAll('.question-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (selectedQuestion) {
            const type = btn.dataset.type;
            const question = formData.questions.find(q => q.id === selectedQuestion);
            if (question) {
                question.type = type;
                if (type === 'choice' || type === 'checkbox') {
                    question.options = ['ตัวเลือก 1', 'ตัวเลือก 2'];
                } else {
                    question.options = [];
                }
                renderQuestions();
                selectQuestion(selectedQuestion);
            }
        } else {
            addNewQuestion();
        }
    });
});

document.getElementById('formTitle').addEventListener('input', (e) => {
    formData.title = e.target.value;
});

document.getElementById('formDescription').addEventListener('input', (e) => {
    formData.description = e.target.value;
});

document.getElementById('previewToggle').addEventListener('click', () => {
    const exportData = {
        metadata: {
            title: formData.title,
            description: formData.description,
            date: new Date().toLocaleDateString('th-TH'),
            platform: "Microsoft Forms JSON Editor",
            created_by: "Forms Editor User"
        },
        questions: formData.questions.map(q => ({
            id: q.id,
            number: q.number,
            text: q.title,
            type: q.type === 'choice' ? 'single_choice' : 
                  q.type === 'checkbox' ? 'checkbox' : q.type,
            required: q.required,
            options: q.options,
            ...(q.note && { note: q.note })
        }))
    };

    // Create and download JSON
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forms_backup_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    alert('💾 ไฟล์ JSON ถูกดาวน์โหลดแล้ว!\n\n📊 สรุปข้อมูล:\n' + 
          `📝 ชื่อฟอร์ม: ${formData.title || 'ไม่ระบุ'}\n` +
          `📋 จำนวนคำถาม: ${formData.questions.length} คำถาม\n` +
          `⭐ คำถามที่จำเป็น: ${formData.questions.filter(q => q.required).length} คำถาม`);
});

// Initialize
updateStats();