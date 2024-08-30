const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'patrimoine_db',
    password: 'Kiady1508',
    port: 5432,
});

app.use(cors());
app.use(express.json());

// Test de connexion
app.get('/test-connexion', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ message: 'Connexion réussie!', time: result.rows[0].now });
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.status(500).json({ message: 'Erreur de connexion' });
    }
});

// Récupérer toutes les possessions
app.get('/possession', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM possessions');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching possessions:', err.stack);
        res.status(500).json({ error: 'Internal server error while fetching possessions' });
    }
});

// Créer une nouvelle possession
app.post('/possession', async (req, res) => {
    const { libelle, valeur, dateDebut, taux } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO possessions (libelle, valeur, date_debut, taux) VALUES ($1, $2, $3, $4) RETURNING *',
            [libelle, valeur, dateDebut, taux]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating possession:', err.stack);
        res.status(500).json({ error: 'Internal server error while creating possession' });
    }
});

// Récupérer une possession par son libellé
app.get('/possession/:libelle', async (req, res) => {
    const { libelle } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM possessions WHERE libelle = $1',
            [libelle]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Possession not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching possession by libelle:', err.stack);
        res.status(500).json({ error: 'Internal server error while fetching possession by libelle' });
    }
});

// Mettre à jour une possession
app.put('/possession/:libelle', async (req, res) => {
    const { libelle } = req.params;
    const { dateFin } = req.body;
    try {
        const result = await pool.query(
            'UPDATE possessions SET date_fin = $1 WHERE libelle = $2 RETURNING *',
            [dateFin, libelle]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Possession not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating possession:', err.stack);
        res.status(500).json({ error: 'Internal server error while updating possession' });
    }
});

// Clôturer une possession
app.put('/possession/:libelle/close', async (req, res) => {
    const { libelle } = req.params;
    const currentDate = new Date().toISOString().split('T')[0];
    try {
        const result = await pool.query(
            'UPDATE possessions SET date_fin = $1 WHERE libelle = $2 RETURNING *',
            [currentDate, libelle]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Possession not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error closing possession:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Calcul du patrimoine à une date donnée
app.get('/patrimoine/:date', async (req, res) => {
    const { date } = req.params;
    try {
        const result = await pool.query(
            'SELECT SUM(valeur) as valeur FROM possessions WHERE date_debut <= $1 AND (date_fin IS NULL OR date_fin >= $1)',
            [date]
        );
        res.json({ date, valeur: result.rows[0].valeur || 0 });
    } catch (err) {
        console.error('Error calculating patrimoine:', err.stack);
        res.status(500).json({ error: 'Internal server error while calculating patrimoine' });
    }
});

// Récupérer le patrimoine sur une plage de dates
app.post('/patrimoine/range', async (req, res) => {
    const { dateDebut, dateFin, jour, type } = req.body;
    let filteredData = [];

    let currentDate = new Date(dateDebut);
    const endDate = new Date(dateFin);

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        try {
            const result = await pool.query(
                'SELECT SUM(valeur) as valeur FROM possessions WHERE date_debut <= $1 AND (date_fin IS NULL OR date_fin >= $1)',
                [dateStr]
            );
            filteredData.push({ date: dateStr, valeur: result.rows[0].valeur || 0 });
        } catch (err) {
            console.error('Error fetching patrimoine range:', err.stack);
            return res.status(500).json({ error: 'Internal server error while fetching patrimoine range' });
        }

        if (type === 'day') {
            currentDate.setDate(currentDate.getDate() + jour);
        } else if (type === 'week') {
            currentDate.setDate(currentDate.getDate() + jour * 7);
        } else if (type === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }

    res.json(filteredData);
});


// Supprimer une possession par son libellé
app.delete('/possession/:libelle', async (req, res) => {
    const { libelle } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM possessions WHERE libelle = $1 RETURNING *',
            [libelle]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Possession non trouvée' });
        }

        res.status(200).json({ message: 'Possession supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la possession:', error);
        res.status(500).json({ error: 'Erreur interne lors de la suppression de la possession' });
    }
});


// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
