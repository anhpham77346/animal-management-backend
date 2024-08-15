import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/api/animals/:id', async (req, res) => {
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

app.get('/api/animals', async (req, res) => {
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

app.post('/api/animals', async (req, res) => {
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

app.put('/api/animals/:id', async (req, res) => {
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

app.delete('/api/animals/:id', async (req, res) => {
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
