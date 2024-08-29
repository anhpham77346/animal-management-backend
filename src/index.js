import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || "";

app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'Không có token, vui lòng đăng nhập' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token không hợp lệ' });
        }

        // Gán thông tin người dùng vào request để sử dụng sau
        req.user = {
            userId: user.userId,
        };

        next();
    });
};

app.post('/api/signup', async (req, res) => {
    const { email, password, name } = req.body;

    try {
        // Kiểm tra xem email đã tồn tại chưa
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email đã tồn tại' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo người dùng mới
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi khi tạo tài khoản' });
    }
});

// API đăng nhập
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Tìm người dùng theo email
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
        }

        // So sánh mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
        }

        // Tạo JWT
        const token = jwt.sign({ userId: user.id }, SECRET_KEY);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi khi đăng nhập' });
    }
})

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/api/animals/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const animal = await prisma.animal.findUnique({
            where: { id: parseInt(id) },
        });

        if (!animal) {
            return res.status(404).json({ error: 'Animal not found' });
        }

        res.status(200).json(animal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/animals', authenticateToken, async (req, res) => {
    try {
        const animals = await prisma.animal.findMany({
            where: {
                deletedAt: null
            }
        });
        res.status(200).json(animals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/animals', authenticateToken, async (req, res) => {
    try {
        const { name, species, description, imgUrl } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!name || !species) {
            return res.status(400).json({ error: 'Name and species are required' });
        }

        // Thêm thú cưng vào cơ sở dữ liệu
        const newAnimal = await prisma.animal.create({
            data: {
                name,
                species,
                description,
                imgUrl,
                updatedAt: new Date(),
            },
        });

        res.status(201).json(newAnimal);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/animals/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, species, description, imgUrl } = req.body;

    try {
        // Kiểm tra dữ liệu đầu vào
        if (!name && !species && !description) {
            return res.status(400).json({ error: 'At least one field (name, species, description) is required to update' });
        }

        // Cập nhật thú cưng trong cơ sở dữ liệu
        const updatedAnimal = await prisma.animal.update({
            where: { id: parseInt(id) },
            data: {
                name: name || undefined,
                species: species || undefined,
                description: description || undefined,
                imgUrl: imgUrl || undefined,
                updatedAt: new Date(),
            },
        });

        res.status(200).json(updatedAnimal);
    } catch (error) {
        console.log(error);

        if (error.code === 'P2025') {
            // Mã lỗi P2025 của Prisma cho biết đối tượng không tồn tại
            return res.status(404).json({ error: 'Animal not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/animals/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedAnimal = await prisma.animal.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date(),
            }
        });

        res.status(200).json(deletedAnimal);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Animal not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
