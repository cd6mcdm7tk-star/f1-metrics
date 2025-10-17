# 🏎️ F1 Metrics - Plateforme d'Analyse Télémétrique Formula 1

Plateforme complète d'analyse télémétrique Formula 1 avec visualisations interactives, comparaisons de pilotes, et animations de courses en temps réel.

## ✨ Fonctionnalités

- 📊 **Télémétrie détaillée** - Vitesse, throttle, brake, rapports de vitesse
- 🔄 **Comparaison de pilotes** - Graphique delta en temps réel
- 🗺️ **Visualisation de circuits** - Tracés colorés par vitesse
- 🎬 **Animation de courses** - Comparaison visuelle 2D animée
- 🏁 **Classements** - Temps au tour et podiums
- 📈 **Statistiques avancées** - Analyses complètes des performances
- 🏆 **Résultats** - Podiums et classements championnat

## 🛠️ Technologies

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Recharts
- React Router

### Backend
- FastAPI
- Python 3.14
- FastF1
- scipy
- pandas

## 🚀 Installation

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn fastf1 scipy pandas
mkdir -p /tmp/fastf1_cache
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📸 Captures d'écran

(À ajouter)

## 📄 Licence

MIT

## 👨‍💻 Auteur

Créé avec ❤️ pour les fans de F1
