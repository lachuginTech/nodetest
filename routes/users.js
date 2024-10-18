const express = require('express');
const mysql = require('mysql2'); 
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const handleQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};

// Создание пользователя
router.post('/create', [
    body('full_name').isString().notEmpty().withMessage('Full name is required'),
    body('role').isString().notEmpty().withMessage('Role is required'),
    body('efficiency').isInt({ min: 0, max: 100 }).withMessage('Efficiency must be a number between 0 and 100')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, result: { errors: errors.array() } });
    }

    const { full_name, role, efficiency } = req.body;

    const query = 'INSERT INTO users (full_name, role, efficiency) VALUES (?, ?, ?)';

    try {
        const result = await handleQuery(query, [full_name, role, efficiency]);
        res.status(201).json({
            success: true,
            result: { id: result.insertId }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            result: { error: err.message }
        });
    }
});

// Получение пользователей
router.get('/get', [
    query('role').optional().isString().withMessage('Role must be a string')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, result: { errors: errors.array() } });
    }

    const { role } = req.query; 

    let query = 'SELECT * FROM users';
    const queryParams = [];

    if (role) {
        query += ' WHERE role = ?';
        queryParams.push(role);
    }

    try {
        const results = await handleQuery(query, queryParams);
        res.json({
            success: true,
            result: { users: results }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            result: { error: err.message }
        });
    }
});

// Получение пользователя по ID
router.get('/get/:id', [
    param('id').isInt().withMessage('ID must be an integer')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, result: { errors: errors.array() } });
    }

    const userId = req.params.id;

    const query = 'SELECT * FROM users WHERE id = ?';

    try {
        const results = await handleQuery(query, [userId]);
        
        if (results.length === 0) { 
            return res.status(404).json({
                success: false,
                result: { error: 'User not found' }
            });
        }

        res.json({
            success: true,
            result: { user: results[0] }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            result: { error: err.message }
        });
    }
});

// Обновление пользователя
router.patch('/update/:id', [
    param('id').isInt().withMessage('ID must be an integer'),
    body('full_name').optional().isString().notEmpty().withMessage('Full name must be a non-empty string'),
    body('role').optional().isString().notEmpty().withMessage('Role must be a non-empty string'),
    body('efficiency').optional().isInt({ min: 0, max: 100 }).withMessage('Efficiency must be a number between 0 and 100')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, result: { errors: errors.array() } });
    }

    const userId = req.params.id;
    const { full_name, role, efficiency } = req.body;

    const updateFields = [];
    const queryParams = [];

    if (full_name) {
        updateFields.push('full_name = ?');
        queryParams.push(full_name);
    }
    if (role) {
        updateFields.push('role = ?');
        queryParams.push(role);
    }
    if (efficiency !== undefined) { 
        updateFields.push('efficiency = ?');
        queryParams.push(efficiency);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({
            success: false,
            result: { error: 'At least one field must be updated' }
        });
    }

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    queryParams.push(userId);

    try {
        const result = await handleQuery(query, queryParams);
        
        if (result.affectedRows === 0) { 
            return res.status(404).json({
                success: false,
                result: { error: 'User not found' }
            });
        }

        const selectQuery = 'SELECT * FROM users WHERE id = ?';
        const updatedUser = await handleQuery(selectQuery, [userId]);

        res.json({
            success: true,
            result: updatedUser[0]
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            result: { error: err.message }
        });
    }
});

// Удаление пользователя
router.delete('/delete/:id?', [
    param('id').optional().isInt().withMessage('ID must be an integer')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, result: { errors: errors.array() } });
    }

    const userId = req.params.id;

    try {
        if (userId) {
            const selectQuery = 'SELECT * FROM users WHERE id = ?';
            const results = await handleQuery(selectQuery, [userId]);

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    result: { error: 'User not found' }
                });
            }

            const deleteQuery = 'DELETE FROM users WHERE id = ?';
            await handleQuery(deleteQuery, [userId]);

            res.json({
                success: true,
                result: results[0] 
            });
        } else {
            const deleteAllQuery = 'DELETE FROM users';
            await handleQuery(deleteAllQuery);
            res.json({
                success: true 
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            result: { error: err.message }
        });
    }
});

module.exports = router;
