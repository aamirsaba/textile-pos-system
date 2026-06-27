import express, { Request, Response } from 'express';
import Product from '../models/Product';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error?.message || 'Unknown error'
    });
  }
});

// GET product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error?.message || 'Unknown error'
    });
  }
});

// POST create product
router.post('/', async (req: Request, res: Response) => {
  try {
    const product = await Product.create({
      id: uuidv4(),
      ...req.body
    });
    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error?.message || 'Unknown error'
    });
  }
});

// PUT update product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    await product.update(req.body);
    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error?.message || 'Unknown error'
    });
  }
});

// DELETE product (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    await product.update({ isActive: false });
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error?.message || 'Unknown error'
    });
  }
});

export default router;
