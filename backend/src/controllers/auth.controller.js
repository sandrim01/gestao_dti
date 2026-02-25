const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const register = async (req, res) => {
    const { name, email, password, role, team } = req.body;

    try {
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'TECHNICIAN',
                team
            }
        });

        // Auditoria
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_REGISTERED',
                details: `User ${user.email} registered with role ${user.role}`
            }
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log(`[Login] Senha incorreta para: ${email}`);
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        const secret = process.env.JWT_SECRET || 'fallback_secret_gestao_dti_2024';
        const token = jwt.sign(
            { id: user.id, role: user.role, team: user.team },
            secret,
            { expiresIn: '1d' }
        );

        console.log(`[Login] Sucesso: ${email}`);

        // Auditoria
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_LOGIN',
                details: `User ${user.email} logged in`
            }
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
};

const getMe = async (req, res) => {
    res.json({ user: req.user });
};

module.exports = { register, login, getMe };
