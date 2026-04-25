/* ═══════════════════════════════════════════
   MEDICHECK — script.js (Firebase Version)
═══════════════════════════════════════════ */

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let db = null;
let auth = null;
let currentUserId = null;
let currentTags = [];

/* ─────────────────────────────────────────
   SYMPTOM DATABASE
───────────────────────────────────────── */
const SYMPTOM_LIST = [
  "headache","fever","cough","sore throat","runny nose","fatigue","nausea","vomiting",
  "diarrhea","chest pain","shortness of breath","dizziness","joint pain","muscle ache",
  "abdominal pain","back pain","skin rash","itching","swelling","numbness","tingling",
  "blurred vision","ear pain","loss of appetite","weight loss","night sweats","chills",
  "constipation","heartburn","frequent urination","painful urination","hair loss",
  "anxiety","depression","insomnia","palpitations","cold hands","hot flashes",
  "sneezing","nasal congestion","eye redness","eye discharge","yellow skin","dark urine"
];

const QUICK_SYMPTOMS = [
  "Headache","Fever","Cough","Fatigue","Nausea","Dizziness","Chest Pain","Sore Throat"
];

/* ─────────────────────────────────────────
   RULE-BASED DISEASE DATABASE
───────────────────────────────────────── */
const RULES = [
  {
    triggers: ["headache","nausea","light sensitivity","dizziness","throbbing"],
    disease: "Migraine",
    confidence: "High",
    description: "A neurological condition characterised by intense, debilitating headaches often accompanied by nausea and sensitivity to light and sound.",
    advice: "Rest in a dark, quiet room. Stay hydrated. OTC pain relievers (ibuprofen, aspirin) may help. Consult a neurologist if migraines are frequent."
  },
  {
    triggers: ["fever","cough","fatigue","muscle ache","chills"],
    disease: "Influenza (Flu)",
    confidence: "High",
    description: "A highly contagious viral infection of the respiratory tract that strikes suddenly and causes more severe symptoms than a common cold.",
    advice: "Rest and drink plenty of fluids. Antiviral medications may be prescribed. Avoid contact with others to prevent spread."
  },
  {
    triggers: ["cough","sore throat","runny nose","sneezing","nasal congestion"],
    disease: "Common Cold",
    confidence: "High",
    description: "A mild viral infection of the upper respiratory tract, usually resolving within 7–10 days without treatment.",
    advice: "Rest, stay hydrated, use saline nasal sprays. OTC cold medicines relieve symptoms. See a doctor if symptoms worsen after 10 days."
  },
  {
    triggers: ["chest pain","shortness of breath","palpitations","sweating","arm pain"],
    disease: "Cardiac Concern (URGENT)",
    confidence: "High",
    description: "Chest pain combined with shortness of breath or sweating can be a warning sign of a serious cardiovascular event requiring immediate attention.",
    advice: "⚠️ SEEK EMERGENCY CARE IMMEDIATELY. Call emergency services. Do not drive yourself. This requires urgent medical evaluation."
  },
  {
    triggers: ["abdominal pain","diarrhea","nausea","vomiting","fever"],
    disease: "Gastroenteritis",
    confidence: "Medium",
    description: "An intestinal infection causing inflammation of the stomach and intestines, typically from viral or bacterial sources.",
    advice: "Stay hydrated with water or oral rehydration solutions. Eat bland (BRAT) foods. See a doctor if symptoms persist beyond 3 days."
  },
  {
    triggers: ["joint pain","swelling","stiffness","fatigue","morning stiffness"],
    disease: "Rheumatoid Arthritis",
    confidence: "Medium",
    description: "An autoimmune condition causing chronic joint inflammation, leading to pain, swelling, and stiffness, particularly in the morning.",
    advice: "Consult a rheumatologist. Regular gentle exercise and physical therapy can help. Anti-inflammatory medications may be prescribed."
  },
  {
    triggers: ["frequent urination","painful urination","burning urination","lower abdominal pain"],
    disease: "Urinary Tract Infection (UTI)",
    confidence: "High",
    description: "A bacterial infection affecting any part of the urinary tract. More common in women, causing discomfort during urination.",
    advice: "See a doctor for antibiotic treatment. Drink plenty of water. Cranberry products may help prevent recurrence."
  },
  {
    triggers: ["skin rash","itching","hives","redness","swelling"],
    disease: "Allergic Reaction / Dermatitis",
    confidence: "Medium",
    description: "An allergic skin reaction caused by exposure to irritants or allergens, resulting in inflammation, rash, and itching.",
    advice: "Identify and avoid triggers. Antihistamines and topical corticosteroids relieve symptoms. Consult a dermatologist for persistent cases."
  },
  {
    triggers: ["fatigue","weight loss","night sweats","fever","swollen lymph nodes"],
    disease: "Systemic Infection / Requires Testing",
    confidence: "Low",
    description: "This symptom cluster may indicate a systemic infection or, in some cases, a blood-related condition. Professional evaluation is essential.",
    advice: "See a doctor immediately for blood tests and a thorough physical examination. Early diagnosis is critical."
  },
  {
    triggers: ["back pain","muscle ache","stiffness","fatigue"],
    disease: "Musculoskeletal Strain",
    confidence: "Medium",
    description: "Muscle strain or tension in the back and surrounding muscles caused by overuse, poor posture, or injury.",
    advice: "Rest and apply heat or cold packs. OTC pain relievers (ibuprofen) help. Physical therapy is recommended for chronic cases."
  }
];

/* ─────────────────────────────────────────
   LOCAL STORAGE (fallback)
───────────────────────────────────────── */
const LOCAL_KEY = 'medicheck_history';

function localSave(record) {
  const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  existing.unshift(record);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(existing.slice(0, 100)));
}

function localLoad() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
}

/* ─────────────────────────────────────────
   PAGE NAVIGATION
───────────────────────────────────────── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  
  if (name === 'history') {
    loadHistory();
  }
}

/* ─────────────────────────────────────────
   SYMPTOM TAGS
───────────────────────────────────────── */
function renderQuickSymptoms() {
  const wrap = document.getElementById('quick-symptoms');
  if (!wrap) return;
  
  wrap.innerHTML = '';
  QUICK_SYMPTOMS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'btn-outline';
    btn.style.cssText = 'padding:.3rem .8rem;font-size:.78rem;border-radius:100px;margin:0.25rem;';
    btn.textContent = '+ ' + s;
    btn.onclick = () => addTag(s.toLowerCase());
    wrap.appendChild(btn);
  });
}

function addTag(text) {
  const val = text.trim().toLowerCase();
  if (!val || currentTags.includes(val)) return;
  currentTags.push(val);
  renderTags();
  const input = document.getElementById('symptom-input');
  if (input) input.value = '';
  closeAutocomplete();
}

function removeTag(val) {
  currentTags = currentTags.filter(t => t !== val);
  renderTags();
}

function renderTags() {
  const container = document.getElementById('symptoms-container');
  if (!container) return;
  
  const input = document.getElementById('symptom-input');
  container.innerHTML = '';
  currentTags.forEach(tag => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.innerHTML = `${tag} <span class="tag-remove" onclick="removeTag('${tag}')">✕</span>`;
    container.appendChild(el);
  });
  if (input) container.appendChild(input);
  if (input) input.focus();
}

function initAutocomplete() {
  const input = document.getElementById('symptom-input');
  const list = document.getElementById('autocomplete-list');
  
  if (!input || !list) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { closeAutocomplete(); return; }
    const matches = SYMPTOM_LIST
      .filter(s => s.includes(q) && !currentTags.includes(s))
      .slice(0, 6);
    if (!matches.length) { closeAutocomplete(); return; }
    list.innerHTML = matches.map(m =>
      `<div class="auto-item" onclick="addTag('${m}')">
         <span class="auto-icon">🔹</span>${m}
       </div>`
    ).join('');
    list.classList.add('open');
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.replace(',', '').trim();
      if (val) addTag(val);
    }
    if (e.key === 'Backspace' && !input.value && currentTags.length) {
      removeTag(currentTags[currentTags.length - 1]);
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.symptoms-wrap')) closeAutocomplete();
  });
}

function closeAutocomplete() {
  const list = document.getElementById('autocomplete-list');
  if (list) list.classList.remove('open');
}

/* ─────────────────────────────────────────
   FIREBASE INITIALIZATION
───────────────────────────────────────── */
function initFirebase() {
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    db = firebase.firestore();
    auth = firebase.auth();
    
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUserId = user.uid;
        console.log("✅ Firebase connected!");
      } else {
        currentUserId = null;
        auth.signInAnonymously().catch(error => {
          console.error("Login error:", error);
        });
      }
    });
  } else {
    setTimeout(initFirebase, 500);
  }
}

/* ─────────────────────────────────────────
   ANALYSIS
───────────────────────────────────────── */
function ruleBasedAnalysis(symptoms) {
  const scores = RULES.map(rule => {
    const matches = rule.triggers.filter(t =>
      symptoms.some(s => s.includes(t) || t.includes(s))
    );
    return { ...rule, score: matches.length };
  });

  const relevant = scores
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!relevant.length) {
    return [{
      name: "No Specific Match Found",
      confidence: "Low",
      description: "The entered symptoms do not strongly match a known pattern in our database.",
      advice: "Please consult a healthcare professional for a proper evaluation."
    }];
  }

  return relevant.map(r => ({
    name: r.disease,
    confidence: r.confidence,
    description: r.description,
    advice: r.advice
  }));
}

async function analyzeSymptoms() {
  const name = document.getElementById('patient-name').value.trim();
  const age = parseInt(document.getElementById('patient-age').value);
  const gender = document.getElementById('patient-gender').value;

  if (!name) { toast('Please enter your full name.', 'error'); return; }
  if (!age || age < 1 || age > 120) { toast('Please enter a valid age.', 'error'); return; }
  if (!currentTags.length) { toast('Please enter at least one symptom.', 'error'); return; }

  const formSection = document.getElementById('form-section');
  const loadingOverlay = document.getElementById('loading-overlay');
  const resultsSection = document.getElementById('results-section');
  
  if (formSection) formSection.style.display = 'none';
  if (loadingOverlay) loadingOverlay.classList.add('visible');
  if (resultsSection) resultsSection.classList.remove('visible');

  const steps = ['Analyzing symptom patterns…', 'Cross-referencing medical database…', 'Generating assessment…'];
  let stepIdx = 0;
  const stepEl = document.getElementById('loading-step');
  const stepTimer = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    if (stepEl) stepEl.textContent = steps[stepIdx];
  }, 1500);

  try {
    const conditions = ruleBasedAnalysis(currentTags);
    const urgent = conditions.some(c => c.name.includes("URGENT") || c.name.includes("Cardiac"));
    const urgencyNote = urgent ? "⚠️ URGENT: These symptoms require immediate medical attention." : "";

    clearInterval(stepTimer);
    await saveRecord({ name, age, gender, symptoms: currentTags, conditions });
    renderResults({ name, age, gender, symptoms: currentTags, conditions, urgent, urgencyNote });

  } catch (err) {
    clearInterval(stepTimer);
    console.error(err);
    toast('Analysis failed. Please try again.', 'error');
    if (formSection) formSection.style.display = 'block';
    if (loadingOverlay) loadingOverlay.classList.remove('visible');
  }
}

function renderResults({ name, age, gender, symptoms, conditions, urgent, urgencyNote }) {
  const loadingOverlay = document.getElementById('loading-overlay');
  const resultsSection = document.getElementById('results-section');
  
  if (loadingOverlay) loadingOverlay.classList.remove('visible');
  if (resultsSection) resultsSection.classList.add('visible');

  const resName = document.getElementById('res-patient-name');
  const resMeta = document.getElementById('res-patient-meta');
  if (resName) resName.textContent = name;
  if (resMeta) resMeta.textContent = `Age ${age}${gender ? ' · ' + capitalize(gender) : ''} · ${symptoms.length} symptom(s)`;

  const summary = document.getElementById('patient-summary');
  if (summary) {
    summary.innerHTML = `
      <div class="ps-item"><span class="ps-label">Name</span><span class="ps-value">${name}</span></div>
      <div class="ps-item"><span class="ps-label">Age</span><span class="ps-value">${age} years</span></div>
      ${gender ? `<div class="ps-item"><span class="ps-label">Gender</span><span class="ps-value">${capitalize(gender)}</span></div>` : ''}
      <div class="ps-item"><span class="ps-label">Symptoms</span><span class="ps-value">${symptoms.join(', ')}</span></div>
    `;
  }

  const oldBanner = document.getElementById('urgent-banner');
  if (oldBanner) oldBanner.remove();
  
  if (urgent && urgencyNote && summary) {
    const banner = document.createElement('div');
    banner.id = 'urgent-banner';
    banner.style.cssText = 'background:#FFEBEE;border:1.5px solid #E53935;border-radius:8px;padding:.85rem 1rem;color:#B71C1C;font-weight:600;margin-bottom:1.25rem;';
    banner.innerHTML = '🚨 ' + urgencyNote;
    summary.insertAdjacentElement('afterend', banner);
  }

  const cardsEl = document.getElementById('disease-cards');
  if (cardsEl) {
    cardsEl.innerHTML = '';
    conditions.slice(0, 3).forEach((c, i) => {
      const confClass = c.confidence === 'High' ? 'high' : c.confidence === 'Medium' ? 'medium' : 'low';
      const card = document.createElement('div');
      card.className = 'disease-card';
      card.innerHTML = `
        <div class="dc-head">
          <div class="dc-rank rank-${i + 1}">${i + 1}</div>
          <div class="dc-name">${c.name}</div>
          <div class="dc-confidence ${confClass}">${c.confidence} Match</div>
        </div>
        <div class="dc-body">
          <div class="dc-section-label">Description</div>
          <div class="dc-desc">${c.description}</div>
          <div class="dc-section-label" style="margin-top:0.75rem;">Advice</div>
          <div class="dc-advice">💡 ${c.advice}</div>
        </div>
      `;
      cardsEl.appendChild(card);
    });
  }

  toast(`Analysis complete — ${conditions.length} condition(s) found.`, 'success');
}

async function saveRecord({ name, age, gender, symptoms, conditions }) {
  const primaryDisease = conditions[0]?.name || 'Unknown';

  // Save to localStorage (always)
  localSave({
    full_name: name, age, gender,
    symptoms: symptoms.join(', '),
    predicted_disease: primaryDisease,
    confidence: conditions[0]?.confidence || 'Low',
    description: conditions[0]?.description || '',
    advice: conditions[0]?.advice || '',
    created_at: new Date().toISOString()
  });

  // Save to Firebase if available
  if (db && currentUserId) {
    try {
      await db.collection('medical_history').add({
        userId: currentUserId,
        patientName: name,
        age: age,
        gender: gender,
        symptoms: symptoms.join(', '),
        diagnosis: primaryDisease,
        confidence: conditions[0]?.confidence || 'Low',
        description: conditions[0]?.description || '',
        advice: conditions[0]?.advice || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: new Date().toLocaleString()
      });
      console.log("✅ Saved to Firebase!");
      toast('Saved to cloud!', 'success');
    } catch (err) {
      console.warn('Firebase save failed:', err.message);
    }
  }
}

async function loadHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  container.innerHTML = '<div class="skeleton" style="height:80px;margin-bottom:.75rem;"></div>'.repeat(3);

  let records = [];

  // Try Firebase first
  if (db && currentUserId) {
    try {
      const snapshot = await db.collection('medical_history')
        .where('userId', '==', currentUserId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      if (!snapshot.empty) {
        records = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          records.push({
            full_name: data.patientName,
            age: data.age,
            gender: data.gender,
            symptoms: data.symptoms,
            predicted_disease: data.diagnosis,
            created_at: data.timestamp?.toDate()?.toISOString() || new Date().toISOString()
          });
        });
      }
    } catch (err) {
      console.warn('Firebase load failed:', err.message);
    }
  }

  // Fallback to localStorage
  if (!records.length) {
    records = localLoad();
  }

  setTimeout(() => {
    if (!records.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><div class="empty-title">No records yet</div><div class="empty-desc">Submit a symptom assessment to see results here.</div></div>`;
      return;
    }

    container.innerHTML = `<div class="status-bar" style="margin-bottom:.75rem;"><span>${records.length} record(s) found</span></div><div class="history-list">${records.map(r => historyItemHTML(r)).join('')}</div>`;
  }, 600);
}

function historyItemHTML(r) {
  const symptoms = r.symptoms ? r.symptoms.split(',').map(s => s.trim()) : [];
  const date = new Date(r.created_at);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString();
  
  return `<div class="history-item"><div><div class="hi-name">${r.full_name}</div><div class="hi-meta">Age ${r.age}</div><div class="hi-diagnosis">🔬 ${r.predicted_disease}</div></div><div class="hi-date">${dateStr}<br>${timeStr}</div></div>`;
}

function resetForm() {
  const nameInput = document.getElementById('patient-name');
  const ageInput = document.getElementById('patient-age');
  const genderSelect = document.getElementById('patient-gender');
  const formSection = document.getElementById('form-section');
  const loadingOverlay = document.getElementById('loading-overlay');
  const resultsSection = document.getElementById('results-section');
  
  if (nameInput) nameInput.value = '';
  if (ageInput) ageInput.value = '';
  if (genderSelect) genderSelect.value = '';
  
  currentTags = [];
  renderTags();

  if (formSection) formSection.style.display = 'block';
  if (loadingOverlay) loadingOverlay.classList.remove('visible');
  if (resultsSection) resultsSection.classList.remove('visible');

  const oldBanner = document.getElementById('urgent-banner');
  if (oldBanner) oldBanner.remove();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderQuickSymptoms();
  initAutocomplete();
  initFirebase();
});