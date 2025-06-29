// Configuration PWA
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  installBtn.classList.add('hidden');
  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  installBtn.classList.add('hidden');
  deferredPrompt = null;
  alert("L'application a été installée avec succès !");
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès:', registration);
      })
      .catch(error => {
        console.log("Échec de l'enregistrement du Service Worker:", error);
      });
  });
}

// Logique de l'application
let appareilCount = 0;
let budgetAppareilCount = 0;
let camembertChart;

// Éléments DOM
const addBtn = document.getElementById('add-btn');
const calcBtn = document.getElementById('calc-btn');
const resetBtn = document.getElementById('reset-btn');
const themeToggle = document.getElementById('theme-toggle');
const historyList = document.getElementById('history-list');

const budgetAddBtn = document.getElementById('budget-add-btn');
const budgetCalcBtn = document.getElementById('budget-calc-btn');
const budgetResetBtn = document.getElementById('budget-reset-btn');
const budgetHistoryList = document.getElementById('budget-history-list');

const tabs = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');

// Boutons d'effacement de l'historique
const clearHistoryBtn = document.getElementById('clear-history');
const clearBudgetHistoryBtn = document.getElementById('clear-budget-history');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  ajouterAppareil();
  ajouterBudgetAppareil();
  
  // Charger le thème depuis localStorage
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  // Gestion des onglets
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      
      // Mettre à jour les onglets
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Afficher la page correspondante
      pages.forEach(page => page.classList.remove('active'));
      document.getElementById(`${tabId}-page`).classList.add('active');
    });
  });
  
  // Événements d'effacement de l'historique
  clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Voulez-vous vraiment effacer tout l\'historique des calculs ?')) {
      historyList.innerHTML = '<div class="empty-history">Historique vide</div>';
    }
  });
  
  clearBudgetHistoryBtn.addEventListener('click', function() {
    if (confirm('Voulez-vous vraiment effacer tout l\'historique des simulations ?')) {
      budgetHistoryList.innerHTML = '<div class="empty-history">Historique vide</div>';
    }
  });
});

// Événements - Page Recharge
addBtn.addEventListener('click', ajouterAppareil);
resetBtn.addEventListener('click', reinitialiser);
themeToggle.addEventListener('click', toggleTheme);

document.getElementById('appareil-form').addEventListener('input', function() {
  const hasCards = document.querySelectorAll('#appareils .appareil-card').length > 0;
  calcBtn.disabled = !hasCards || !validateTarif();
});

document.getElementById('tarifKWh').addEventListener('input', function() {
  validateTarif();
});

document.getElementById('appareil-form').addEventListener('submit', function(e) {
  e.preventDefault();
  calculer();
});

// Événements - Page Budget
budgetAddBtn.addEventListener('click', ajouterBudgetAppareil);
budgetResetBtn.addEventListener('click', reinitialiserBudget);

document.getElementById('budget-appareil-form').addEventListener('input', function() {
  const hasCards = document.querySelectorAll('#budget-appareils .appareil-card').length > 0;
  const budget = parseFloat(document.getElementById('budget').value);
  const tarif = parseFloat(document.getElementById('budget-tarif').value);
  
  budgetCalcBtn.disabled = !hasCards || isNaN(budget) || budget <= 0 || isNaN(tarif) || tarif <= 0;
});

document.getElementById('budget').addEventListener('input', function() {
  validateBudget();
});

document.getElementById('budget-tarif').addEventListener('input', function() {
  validateBudgetTarif();
});

document.getElementById('budget-appareil-form').addEventListener('submit', function(e) {
  e.preventDefault();
  simulerBudget();
});

// Fonctions communes
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  
  if (document.body.classList.contains('dark-theme')) {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', 'dark');
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', 'light');
  }
  
  // Mettre à jour le graphique si existant
  if (camembertChart) {
    camembertChart.update();
  }
}

// Fonctions - Page Recharge
function ajouterAppareil() {
  appareilCount++;
  const card = document.createElement('div');
  card.className = 'appareil-card';
  card.innerHTML = `
    <button class="remove-btn" title="Supprimer" aria-label="Supprimer"><i class="fas fa-times"></i></button>
    <div class="input-group">
      <label><i class="fas fa-tag"></i> Nom :</label>
      <input type="text" class="appareil-nom" placeholder="Ex: Réfrigérateur" required>
      <div class="error-message">Veuillez saisir un nom</div>
    </div>
    <div class="input-group">
      <label><i class="fas fa-plug"></i> Puissance (W) :</label>
      <input type="number" class="appareil-puissance" min="0" required>
      <div class="error-message">Veuillez saisir une puissance valide</div>
    </div>
    <div class="input-group">
      <label><i class="fas fa-clock"></i> Heures/jour :</label>
      <input type="number" class="appareil-heures" min="0" max="24" step="0.1" required>
      <div class="error-message">Veuillez saisir un nombre entre 0 et 24</div>
    </div>
    <div class="input-group">
      <label><i class="fas fa-calendar-day"></i> Jours/mois :</label>
      <input type="number" class="appareil-jours" min="0" max="31" value="30" required>
      <div class="error-message">Veuillez saisir un nombre entre 0 et 31</div>
    </div>
    <div class="input-group grid-colspan-2">
      <label><i class="fas fa-layer-group"></i> Quantité :</label>
      <input type="number" class="appareil-quantite" min="1" value="1" required>
      <div class="error-message">Veuillez saisir une quantité valide (minimum 1)</div>
    </div>
  `;
  
  const removeBtn = card.querySelector('.remove-btn');
  removeBtn.addEventListener('click', function() {
    card.classList.remove('visible');
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      card.remove();
      document.getElementById('resultat').classList.remove('visible');
      document.getElementById('camembert').classList.remove('visible-chart');
      calcBtn.disabled = document.querySelectorAll('#appareils .appareil-card').length === 0;
    }, 400);
  });
  
  // Validation en temps réel
  const inputs = card.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', function() {
      validateInput(this);
    });
  });
  
  document.getElementById('appareils').appendChild(card);
  
  // Animation d'apparition
  setTimeout(() => {
    card.classList.add('visible');
  }, 50);
  
  calcBtn.disabled = false;
  return card;
}

function validateInput(input) {
  const errorMsg = input.parentElement.querySelector('.error-message');
  let isValid = true;
  
  if (input.value.trim() === '') {
    isValid = false;
  } else if (input.type === 'number') {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    
    if (isNaN(value)) {
      isValid = false;
    } else if (input.classList.contains('appareil-heures') && (value < 0 || value > 24)) {
      isValid = false;
    } else if (input.classList.contains('appareil-jours') && (value < 0 || value > 31)) {
      isValid = false;
    } else if (input.classList.contains('appareil-quantite') && value < 1) {
      isValid = false;
    }
  }
  
  if (!isValid) {
    input.style.borderColor = 'var(--danger)';
    errorMsg.style.display = 'block';
  } else {
    input.style.borderColor = '';
    errorMsg.style.display = 'none';
  }
  
  return isValid;
}

function validateTarif() {
  const tarifInput = document.getElementById('tarifKWh');
  const errorMsg = document.getElementById('tarif-error');
  const value = parseFloat(tarifInput.value);
  
  if (isNaN(value) || value <= 0) {
    tarifInput.style.borderColor = 'var(--danger)';
    errorMsg.style.display = 'block';
    return false;
  }
  
  tarifInput.style.borderColor = '';
  errorMsg.style.display = 'none';
  return true;
}

function validateAll() {
  let isValid = validateTarif();
  let invalidInputs = 0;
  
  document.querySelectorAll('#appareils .appareil-card').forEach(card => {
    const inputs = card.querySelectorAll('input');
    inputs.forEach(input => {
      if (!validateInput(input)) {
        invalidInputs++;
      }
    });
  });
  
  return isValid && invalidInputs === 0;
}

function calculer() {
  if (!validateAll()) {
    alert('Veuillez corriger les erreurs dans le formulaire avant de calculer.');
    return;
  }
  
  let totalKWh = 0;
  let labels = [];
  let data = [];
  let colors = [];
  const tarif = parseFloat(document.getElementById('tarifKWh').value);
  
  document.querySelectorAll('#appareils .appareil-card').forEach(card => {
    const nom = card.querySelector('.appareil-nom').value;
    const puissance = parseFloat(card.querySelector('.appareil-puissance').value);
    const heures = parseFloat(card.querySelector('.appareil-heures').value);
    const jours = parseFloat(card.querySelector('.appareil-jours').value);
    const quantite = parseFloat(card.querySelector('.appareil-quantite').value);
    
    const kwh = (puissance * heures * jours * quantite) / 1000;
    totalKWh += kwh;
    
    // Ajouter la quantité au nom si > 1
    const label = quantite > 1 ? `${nom} (x${quantite})` : nom;
    labels.push(label);
    data.push(kwh);
    colors.push(getRandomColor());
  });
  
  const totalFCFA = totalKWh * tarif;
  const result = document.getElementById('resultat');
  
  result.innerHTML = `
    <div style="text-align: center; margin-bottom: 15px;">
      <i class="fas fa-chart-pie" style="font-size: 2rem; color: var(--primary);"></i>
    </div>
    <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
      <div style="text-align: center;">
        <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">Consommation</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${totalKWh.toFixed(2)} kWh</div>
        <div>par mois</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">Coût</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${totalFCFA.toFixed(0)} FCFA</div>
        <div>par mois</div>
      </div>
    </div>
    <div style="text-align: center; font-size: 0.9rem; color: var(--gray);">
      <i class="fas fa-info-circle"></i> Tarif utilisé: ${tarif} FCFA/kWh
    </div>
    <div style="text-align: center; font-size: 0.9rem; color: var(--gray); margin-top: 15px;">
      <i class="fas fa-lightbulb"></i> Vous avez saisi ${appareilCount} appareil(s) avec quantité
    </div>
  `;
  
  result.classList.add('visible');
  afficherCamembert(labels, data, colors);
  document.getElementById('camembert').classList.add('visible-chart');
  
  // Ajouter à l'historique
  ajouterHistorique(totalKWh, totalFCFA, labels);
  
  // Scroll doux vers les résultats
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function afficherCamembert(labels, data, colors) {
  const ctx = document.getElementById('camembert').getContext('2d');
  
  if (camembertChart) {
    camembertChart.destroy();
  }
  
  camembertChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: 'var(--card-bg)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 12
            },
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.chart.getDatasetMeta(0).total;
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value.toFixed(2)} kWh (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });
}

function getRandomColor() {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#8AC926', '#1982C4', '#6A4C93', '#F15BB5', '#00BBF9', '#00F5D4'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function reinitialiser() {
  if (confirm('Êtes-vous sûr de vouloir tout réinitialiser ?')) {
    document.getElementById('appareils').innerHTML = '';
    document.getElementById('resultat').classList.remove('visible');
    document.getElementById('camembert').classList.remove('visible-chart');
    calcBtn.disabled = true;
    appareilCount = 0;
    ajouterAppareil();
  }
}

function ajouterHistorique(totalKWh, totalFCFA, appareils) {
  // Vérifier si l'historique est vide
  if (historyList.innerHTML.includes('empty-history')) {
    historyList.innerHTML = '';
  }
  
  const now = new Date();
  const dateStr = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const historyItem = document.createElement('div');
  historyItem.className = 'history-item';
  historyItem.innerHTML = `
    <div>
      <div><strong>${totalKWh.toFixed(2)} kWh</strong></div>
      <div style="font-size: 0.8rem; color: var(--gray);">${appareils.join(', ')}</div>
    </div>
    <div style="text-align: right;">
      <div><strong>${totalFCFA.toFixed(0)} FCFA</strong></div>
      <div style="font-size: 0.8rem; color: var(--gray);">${dateStr}</div>
    </div>
  `;
  
  historyList.insertBefore(historyItem, historyList.firstChild);
  
  // Limiter l'historique à 5 éléments
  if (historyList.children.length > 5) {
    historyList.removeChild(historyList.lastChild);
  }
}

// Fonctions - Page Budget
function ajouterBudgetAppareil() {
  budgetAppareilCount++;
  const card = document.createElement('div');
  card.className = 'appareil-card';
  card.innerHTML = `
    <button class="remove-btn" title="Supprimer" aria-label="Supprimer"><i class="fas fa-times"></i></button>
    <div class="input-group">
      <label><i class="fas fa-tag"></i> Nom :</label>
      <input type="text" class="appareil-nom" placeholder="Ex: Télévision" required>
      <div class="error-message">Veuillez saisir un nom</div>
    </div>
    <div class="input-group">
      <label><i class="fas fa-plug"></i> Puissance (W) :</label>
      <input type="number" class="appareil-puissance" min="0" required>
      <div class="error-message">Veuillez saisir une puissance valide</div>
    </div>
    <div class="input-group">
      <label><i class="fas fa-clock"></i> Heures/jour :</label>
      <input type="number" class="appareil-heures" min="0" max="24" step="0.1" required>
      <div class="error-message">Veuillez saisir un nombre entre 0 et 24</div>
    </div>
    <div class="input-group grid-colspan-2">
      <label><i class="fas fa-layer-group"></i> Quantité :</label>
      <input type="number" class="appareil-quantite" min="1" value="1" required>
      <div class="error-message">Veuillez saisir une quantité valide (minimum 1)</div>
    </div>
  `;
  
  const removeBtn = card.querySelector('.remove-btn');
  removeBtn.addEventListener('click', function() {
    card.classList.remove('visible');
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      card.remove();
      document.getElementById('budget-result').classList.remove('visible');
      budgetCalcBtn.disabled = document.querySelectorAll('#budget-appareils .appareil-card').length === 0;
    }, 400);
  });
  
  // Validation en temps réel
  const inputs = card.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', function() {
      validateBudgetInput(this);
    });
  });
  
  document.getElementById('budget-appareils').appendChild(card);
  
  // Animation d'apparition
  setTimeout(() => {
    card.classList.add('visible');
  }, 50);
  
  budgetCalcBtn.disabled = false;
  return card;
}

function validateBudgetInput(input) {
  const errorMsg = input.parentElement.querySelector('.error-message');
  let isValid = true;
  
  if (input.value.trim() === '') {
    isValid = false;
  } else if (input.type === 'number') {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    
    if (isNaN(value)) {
      isValid = false;
    } else if (input.classList.contains('appareil-heures') && (value < 0 || value > 24)) {
      isValid = false;
    } else if (input.classList.contains('appareil-quantite') && value < 1) {
      isValid = false;
    }
  }
  
  if (!isValid) {
    input.style.borderColor = 'var(--danger)';
    errorMsg.style.display = 'block';
  } else {
    input.style.borderColor = '';
    errorMsg.style.display = 'none';
  }
  
  return isValid;
}

function validateBudget() {
  const budgetInput = document.getElementById('budget');
  const errorMsg = document.getElementById('budget-error');
  const value = parseFloat(budgetInput.value);
  
  if (isNaN(value) || value <= 0) {
    budgetInput.style.borderColor = 'var(--danger)';
    errorMsg.style.display = 'block';
    return false;
  }
  
  budgetInput.style.borderColor = '';
  errorMsg.style.display = 'none';
  return true;
}

function validateBudgetTarif() {
  const tarifInput = document.getElementById('budget-tarif');
  const errorMsg = document.getElementById('budget-tarif-error');
  const value = parseFloat(tarifInput.value);
  
  if (isNaN(value) || value <= 0) {
    tarifInput.style.borderColor = 'var(--danger)';
    errorMsg.style.display = 'block';
    return false;
  }
  
  tarifInput.style.borderColor = '';
  errorMsg.style.display = 'none';
  return true;
}

function validateBudgetAll() {
  let isValid = validateBudget() && validateBudgetTarif();
  
  document.querySelectorAll('#budget-appareils .appareil-card').forEach(card => {
    const inputs = card.querySelectorAll('input');
    inputs.forEach(input => {
      if (!validateBudgetInput(input)) {
        isValid = false;
      }
    });
  });
  
  return isValid;
}

function simulerBudget() {
  if (!validateBudgetAll()) {
    alert('Veuillez corriger les erreurs dans le formulaire avant de simuler.');
    return;
  }
  
  const budget = parseFloat(document.getElementById('budget').value);
  const tarif = parseFloat(document.getElementById('budget-tarif').value);
  
  let consommationTotaleParJour = 0;
  let appareils = [];
  
  document.querySelectorAll('#budget-appareils .appareil-card').forEach(card => {
    const nom = card.querySelector('.appareil-nom').value;
    const puissance = parseFloat(card.querySelector('.appareil-puissance').value);
    const heures = parseFloat(card.querySelector('.appareil-heures').value);
    const quantite = parseFloat(card.querySelector('.appareil-quantite').value);
    
    const kwhParJour = (puissance * heures * quantite) / 1000;
    consommationTotaleParJour += kwhParJour;
    
    appareils.push({
      nom,
      puissance,
      heures,
      quantite,
      kwhParJour
    });
  });
  
  if (consommationTotaleParJour === 0) {
    alert('La consommation totale ne peut pas être nulle. Vérifiez vos données.');
    return;
  }
  
  const coutParJour = consommationTotaleParJour * tarif;
  const joursPossibles = budget / coutParJour;
  
  const result = document.getElementById('budget-result');
  
  let detailsHTML = '<div style="margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 15px;">';
  detailsHTML += '<div style="font-weight: bold; margin-bottom: 10px;">Détails par appareil:</div>';
  
  appareils.forEach(appareil => {
    const pourcentage = (appareil.kwhParJour / consommationTotaleParJour * 100).toFixed(1);
    detailsHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div>${appareil.nom}${appareil.quantite > 1 ? ` (x${appareil.quantite})` : ''}</div>
        <div><strong>${appareil.kwhParJour.toFixed(2)} kWh/jour</strong> (${pourcentage}%)</div>
      </div>
    `;
  });
  
  detailsHTML += '</div>';
  
  result.innerHTML = `
    <div style="text-align: center; margin-bottom: 15px;">
      <i class="fas fa-calendar-check" style="font-size: 2rem; color: var(--success);"></i>
    </div>
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 1.2rem; font-weight: bold; color: var(--success);">Votre budget permet</div>
      <div style="font-size: 2.5rem; font-weight: bold; color: var(--success);">${joursPossibles.toFixed(1)} jours</div>
      <div>d'utilisation</div>
    </div>
    <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
      <div style="text-align: center;">
        <div style="font-size: 1.1rem; font-weight: bold; color: var(--primary);">Consommation</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${consommationTotaleParJour.toFixed(2)} kWh</div>
        <div>par jour</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.1rem; font-weight: bold; color: var(--primary);">Coût</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${coutParJour.toFixed(0)} FCFA</div>
        <div>par jour</div>
      </div>
    </div>
    ${detailsHTML}
    <div style="text-align: center; font-size: 0.9rem; color: var(--gray); margin-top: 15px;">
      <i class="fas fa-info-circle"></i> Tarif utilisé: ${tarif} FCFA/kWh | Budget: ${budget.toFixed(0)} FCFA
    </div>
  `;
  
  result.classList.add('visible');
  
  // Ajouter à l'historique du budget
  ajouterBudgetHistorique(joursPossibles, budget, consommationTotaleParJour);
  
  // Scroll doux vers les résultats
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function reinitialiserBudget() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser le simulateur de budget ?')) {
    document.getElementById('budget-appareils').innerHTML = '';
    document.getElementById('budget-result').classList.remove('visible');
    document.getElementById('budget').value = '';
    budgetAppareilCount = 0;
    ajouterBudgetAppareil();
  }
}

function ajouterBudgetHistorique(jours, budget, consommation) {
  // Vérifier si l'historique est vide
  if (budgetHistoryList.innerHTML.includes('empty-history')) {
    budgetHistoryList.innerHTML = '';
  }
  
  const now = new Date();
  const dateStr = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const historyItem = document.createElement('div');
  historyItem.className = 'history-item';
  historyItem.innerHTML = `
    <div>
      <div><strong>${jours.toFixed(1)} jours</strong></div>
      <div style="font-size: 0.8rem; color: var(--gray);">${consommation.toFixed(2)} kWh/jour</div>
    </div>
    <div style="text-align: right;">
      <div><strong>${budget.toFixed(0)} FCFA</strong></div>
      <div style="font-size: 0.8rem; color: var(--gray);">${dateStr}</div>
    </div>
  `;
  
  budgetHistoryList.insertBefore(historyItem, budgetHistoryList.firstChild);
  
  // Limiter l'historique à 5 éléments
  if (budgetHistoryList.children.length > 5) {
    budgetHistoryList.removeChild(budgetHistoryList.lastChild);
  }
}