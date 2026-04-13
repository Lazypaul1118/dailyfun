// ===== DailyFun App - Main Application =====

const STORAGE_KEY = 'dailyfun_entries';
let entries = [];
let selectedMood = '😄';
let currentImages = [];
let shareTargetId = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  loadEntries();
  renderCards();
  updateStats();
  setupDragDrop();
  setupMoodSelector();
  setupCharCount();
});

// ===== STORAGE =====
function loadEntries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    entries = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load entries:', e);
    entries = [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save:', e);
    showToast('存储空间可能不足了', 'error');
  }
}

// ===== STATS =====
function updateStats() {
  const total = entries.length;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = entries.filter(e => e.date === today).length;
  const imgCount = entries.reduce((sum, e) => sum + (e.images ? e.images.length : 0), 0);

  animateNumber('totalCount', total);
  animateNumber('todayCount', todayCount);
  animateNumber('imageCount', imgCount);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  const duration = 500;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ===== RENDER CARDS =====
function renderCards() {
  const grid = document.getElementById('cardsGrid');
  const emptyState = document.getElementById('emptyState');

  if (entries.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Sort by date descending (newest first)
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  grid.innerHTML = sorted.map((entry, index) => createCard(entry, index)).join('');
}

function createCard(entry, index) {
  const hasImages = entry.images && entry.images.length > 0;
  const previewImg = hasImages ? entry.images[0] : '';
  const dateStr = formatDate(new Date(entry.createdAt));
  const timeStr = formatTime(new Date(entry.createdAt));

  return `
    <article class="fun-card bg-white rounded-2xl overflow-hidden shadow-sm shadow-slate-100/50 cursor-pointer opacity-0 animate-fade-in-up" 
             style="animation-delay: ${index * 0.06}s"
             onclick="openDetail('${entry.id}')"
             role="button"
             tabindex="0"
             aria-label="查看趣事: ${escapeHtml(entry.title || '无标题')}">
      
      ${hasImages ? `
      <div class="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img src="${previewImg}" alt="${escapeHtml(entry.title)}" 
             class="w-full h-full preview-img"
             onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center\\'><svg class=\\'w-12 h-12 text-sky-300\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'3\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><path d=\\'M21 15l-5-5L5 21\\'/></svg></div>'">
        ${entry.images.length > 1 ? `
        <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
          +${entry.images.length - 1}
        </div>
        ` : ''}
      </div>
      ` : `
      <div class="aspect-[4/3] bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100 flex items-center justify-center">
        <span class="text-4xl">${entry.mood || '📝'}</span>
      </div>
      `}

      <div class="p-4 space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">${escapeHtml(entry.title) || '无标题趣事'}</h3>
          <span class="text-lg shrink-0">${entry.mood || ''}</span>
        </div>
        
        ${entry.content ? `
        <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">${escapeHtml(entry.content)}</p>
        ` : ''}

        <div class="flex items-center justify-between pt-1">
          <time class="text-xs text-slate-400">${dateStr} ${timeStr}</time>
          <div class="flex items-center gap-1.5">
            <button 
              onclick="event.stopPropagation(); openShare('${entry.id}')" 
              class="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
              aria-label="分享">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>
            <button 
              onclick="event.stopPropagation(); deleteEntry('${entry.id}')" 
              class="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              aria-label="删除">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ===== UPLOAD MODAL =====
function openUploadModal() {
  document.getElementById('uploadModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  resetUploadForm();
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.add('hidden');
  document.body.style.overflow = '';
}

function resetUploadForm() {
  document.getElementById('titleInput').value = '';
  document.getElementById('contentInput').value = '';
  document.getElementById('charCount').textContent = '0';
  currentImages = [];
  selectedMood = '😄';
  
  // Reset image preview
  document.getElementById('imagePreviewContainer').innerHTML = '';
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('uploadPlaceholder').classList.remove('hidden');
  
  // Reset mood selection
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.remove('bg-sky-500', 'text-white', 'border-sky-500');
  });
  document.querySelector(`.mood-btn[data-mood="😄"]`).classList.add('bg-sky-500', 'text-white', 'border-sky-500');
}

// ===== FILE HANDLING =====
function setupDragDrop() {
  const zone = document.getElementById('uploadZone');

  ['dragenter', 'dragover'].forEach(event => {
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.add('dragover', 'border-sky-400', 'bg-sky-50/30');
    });
  });

  ['dragleave', 'drop'].forEach(event => {
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.remove('dragover', 'border-sky-400', 'bg-sky-50/30');
    });
  });

  zone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files.slice(0, 9));
  });
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files).slice(0, 9);
  handleFiles(files);
}

function handleFiles(files) {
  if (files.length > 0 && currentImages.length >= 9) {
    showToast('最多只能上传9张图片哦~', 'warning');
    return;
  }

  const remaining = 9 - currentImages.length;
  files.slice(0, remaining).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentImages.push(e.target.result);
      updateImagePreview();
    };
    reader.readAsDataURL(file);
  });
}

function updateImagePreview() {
  const container = document.getElementById('imagePreviewContainer');
  const placeholder = document.getElementById('uploadPlaceholder');

  if (currentImages.length > 0) {
    placeholder.classList.add('hidden');
    container.classList.remove('hidden');
    
    container.innerHTML = currentImages.map((src, i) => `
      <div class="relative aspect-square rounded-xl overflow-hidden group bg-slate-100">
        <img src="${src}" alt="预览图${i+1}" class="w-full h-full object-cover preview-img">
        <button 
          onclick="removeImage(${i})" 
          class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-500">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');
  } else {
    placeholder.classList.remove('hidden');
    container.classList.add('hidden');
  }
}

function removeImage(index) {
  currentImages.splice(index, 1);
  updateImagePreview();
}

// ===== MOOD SELECTOR =====
function setupMoodSelector() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => {
        b.classList.remove('bg-sky-500', 'text-white', 'border-sky-500');
      });
      btn.classList.add('bg-sky-500', 'text-white', 'border-sky-500');
      selectedMood = btn.dataset.mood;
    });
  });
  // Default select first
  document.querySelector('.mood-btn').classList.add('bg-sky-500', 'text-white', 'border-sky-500');
}

// ===== CHAR COUNT =====
function setupCharCount() {
  const textarea = document.getElementById('contentInput');
  textarea.addEventListener('input', () => {
    document.getElementById('charCount').textContent = textarea.value.length;
  });
}

// ===== SAVE ENTRY =====
function saveEntry() {
  const title = document.getElementById('titleInput').value.trim();
  const content = document.getElementById('contentInput').value.trim();

  if (!title && !content && currentImages.length === 0) {
    showToast('至少写点内容或上传一张图片吧~', 'warning');
    return;
  }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title: title || `${selectedMood} 趣事 #${entries.length + 1}`,
    content,
    mood: selectedMood,
    images: [...currentImages],
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  entries.push(entry);
  saveToStorage();
  
  closeUploadModal();
  renderCards();
  updateStats();
  showToast('记录成功！可以分享给朋友啦 🎉');

  // Auto-open share for the new entry
  setTimeout(() => openShare(entry.id), 600);
}

// ===== DELETE ENTRY =====
function deleteEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  
  if (!confirm(`确定要删除「${entry.title}」吗？`)) return;

  entries = entries.filter(e => e.id !== id);
  saveToStorage();
  renderCards();
  updateStats();
  showToast('已删除');
}

// ===== DETAIL MODAL =====
function openDetail(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  const hasImages = entry.images && entry.images.length > 0;
  const dateStr = formatDateFull(new Date(entry.createdAt));

  document.getElementById('detailContent').innerHTML = `
    <div class="relative">
      <button onclick="closeDetailModal()" class="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      ${hasImages ? `
      <div class="carousel relative">
        <div class="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" style="-ms-overflow-style:none;scrollbar-width:none;">
          ${entry.images.map(img => `
            <div class="snap-center shrink-0 w-full">
              <img src="${img}" alt="${escapeHtml(entry.title)}" class="w-full max-h-80 object-contain bg-slate-900">
            </div>
          `).join('')}
        </div>
        ${entry.images.length > 1 ? `
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          ${entry.images.map((_, i) => `
            <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
          `).join('')}
        </div>
        ` : ''}
      </div>
      ` : `
      <div class="h-48 bg-gradient-to-br from-sky-200 via-emerald-100 to-sky-300 flex items-center justify-center">
        <span class="text-7xl">${entry.mood || '📝'}</span>
      </div>
      `}
    </div>

    <div class="p-6 space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-slate-800">${escapeHtml(entry.title)}</h2>
          <time class="text-sm text-slate-400 mt-1 block">${dateStr}</time>
        </div>
        <span class="text-3xl">${entry.mood || ''}</span>
      </div>

      ${entry.content ? `
      <div class="prose prose-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
        ${escapeHtml(entry.content)}
      </div>
      ` : ''}

      <div class="pt-4 border-t border-slate-100 flex gap-3">
        <button onclick="openShare('${entry.id}'); closeDetailModal();" 
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-medium text-sm hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
          微信分享
        </button>
        <button onclick="deleteEntry('${entry.id}'); closeDetailModal();" 
                class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-medium text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors cursor-pointer">
          删除
        </button>
      </div>
    </div>
  `;

  document.getElementById('detailModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== SHARE MODAL =====
function openShare(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  shareTargetId = id;
  const hasImages = entry.images && entry.images.length > 0;
  const dateStr = formatDateFull(new Date(entry.createdAt));

  // Build share card HTML
  let cardHTML = `
    <div class="share-card-bg rounded-2xl p-5 text-white space-y-3 mb-4">
      <!-- Header -->
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg">
          ${entry.mood || '😄'}
        </div>
        <div>
          <div class="font-semibold text-sm">DailyFun 每日趣事</div>
          <div class="text-xs text-white/70">来自 Paul 的分享</div>
        </div>
      </div>
  `;

  // Image preview in card
  if (hasImages) {
    cardHTML += `
      <div class="rounded-xl overflow-hidden ${entry.images.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}">
        ${entry.images.slice(0, 4).map(img => `
          <img src="${img}" alt="" class="w-full aspect-square object-cover">
        `).join('')}
      </div>
    `;
  }

  cardHTML += `
      <!-- Content -->
      <div>
        <h3 class="font-bold text-base leading-snug">${escapeHtml(entry.title)}</h3>
        ${entry.content ? `<p class="text-xs text-white/85 mt-1 line-clamp-3">${escapeHtml(entry.content)}</p>` : ''}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between text-xs text-white/60 pt-1 border-t border-white/10">
        <span>${dateStr}</span>
        <span>🔗 DailyFun</span>
      </div>
    </div>

    <!-- QR code hint -->
    <div class="text-center py-3">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-600 text-xs font-medium">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zM13 3h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zM15 15h2v2h-2v-2zm2 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 0h2v2h-2v-2z"/>
        </svg>
        扫码或复制链接，在微信中分享给好友
      </div>
    </div>
  `;

  document.getElementById('shareCardPreview').innerHTML = cardHTML;
  document.getElementById('shareModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeShareModal() {
  document.getElementById('shareModal').classList.add('hidden');
  document.body.style.overflow = '';
  shareTargetId = null;
}

// ===== SHARE ACTIONS =====
function copyLink() {
  const url = window.location.href.split('#')[0] + '#share=' + (shareTargetId || '');
  
  navigator.clipboard.writeText(url).then(() => {
    showToast('链接已复制！打开微信粘贴发送即可 📋');
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    showToast('链接已复制！打开微信粘贴发送即可 📋');
  });
}

async function downloadShareCard() {
  const entry = entries.find(e => e.id === shareTargetId);
  if (!entry) return;

  showToast('正在生成分享卡片...⏳');
  
  // Use html2canvas-like approach with a simpler method
  // Create an off-screen rendering element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 750;  // WeChat standard width
  canvas.height = 800;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#07c160');
  gradient.addColorStop(1, '#06ae56');
  ctx.fillStyle = gradient;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 30);
  ctx.fill();

  // Header area
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 30, 30, canvas.width - 60, 70, 20);
  ctx.fill();

  // Avatar circle with mood
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(65, 65, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '32px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.mood || '😄', 65, 67);

  // Name and subtitle
  ctx.font = 'bold 22px Poppins, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('DailyFun 每日趣事', 105, 55);
  ctx.font = '15px Poppins, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('来自 Paul 的分享 · ' + formatDateFull(new Date(entry.createdAt)), 105, 82);

  // Title
  ctx.font = 'bold 30px Poppins, sans-serif';
  ctx.fillStyle = '#ffffff';
  wrapText(ctx, (entry.title || '趣事分享'), 40, 160, canvas.width - 80, 42);

  // Content
  if (entry.content) {
    ctx.font = '19px Poppins, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    wrapText(ctx, entry.content, 40, 220, canvas.width - 80, 30);
  }

  // Image placeholder or actual image
  const hasImages = entry.images && entry.images.length > 0;
  if (hasImages) {
    try {
      const img = await loadImage(canvas, entry.images[0]);
      const imgY = entry.content ? 320 : 270;
      const imgHeight = Math.min(280, canvas.height - imgY - 120);
      roundRect(ctx, 30, imgY, canvas.width - 60, imgHeight, 16);
      ctx.save();
      ctx.clip();
      const scale = Math.max((canvas.width - 60) / img.naturalWidth, imgHeight / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, 30 + ((canvas.width - 60) - w) / 2, imgY + (imgHeight - h) / 2, w, h);
      ctx.restore();
    } catch(e) {
      console.error('Failed to draw image:', e);
    }
  }

  // Footer
  ctx.font = '14px Poppins, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('🔗 DailyFun · 记录生活每一刻精彩', canvas.width / 2, canvas.height - 35);

  // Download
  const link = document.createElement('a');
  link.download = `dailyfun-${shareTargetId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  showToast('分享卡片已下载！发到微信吧 📥');
}

// Canvas helpers
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  let currentY = y;
  
  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      if (currentY > 700) {
        ctx.fillText(line + '...', x, currentY);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastText');

  text.textContent = message;

  if (type === 'success') {
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>';
  } else if (type === 'warning') {
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>';
  } else {
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>';
  }

  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ===== UTILITIES =====
function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}月${day}日`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

function formatDateFull(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  return `${year}年${month}月${day}日 ${weekdays[date.getDay()]} ${hours}:${mins}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Handle URL hash for sharing (when someone opens a shared link)
if (window.location.hash.startsWith('#share=')) {
  const shareId = window.location.hash.replace('#share=', '');
  // Wait for data to load then show detail
  setTimeout(() => {
    const entry = entries.find(e => e.id === shareId);
    if (entry) openDetail(shareId);
  }, 500);
}

// Keyboard support for cards
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeUploadModal();
    closeShareModal();
    closeDetailModal();
  }
});
