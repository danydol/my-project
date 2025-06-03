import { Router, Request, Response } from 'express';
import passport from 'passport';
import { body, param, validationResult } from 'express-validator';
import chatService from '../services/chatService';
import { logger } from '../utils/logger';

const router = Router();

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware to authenticate all chat routes
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/chat/sessions:
 *   get:
 *     summary: Get user's chat sessions
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of chat sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatSession'
 */
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const sessions = await chatService.getUserChatSessions(userId);
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    logger.error('Error fetching chat sessions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat sessions'
    });
  }
});

/**
 * @swagger
 * /api/chat/sessions:
 *   post:
 *     summary: Create a new chat session
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Deploy React App"
 *               repositoryId:
 *                 type: string
 *                 example: "repo_123"
 *     responses:
 *       201:
 *         description: Chat session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chatId:
 *                   type: string
 *                   example: "chat_123456789_abc123"
 */
router.post('/sessions', [
  body('title').notEmpty().withMessage('Title is required'),
  body('repositoryId').optional().isString()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { title, repositoryId } = req.body;
    
    const chatId = await chatService.createChatSession(userId, title, repositoryId);
    
    return res.status(201).json({
      success: true,
      chatId
    });
  } catch (error) {
    logger.error('Error creating chat session', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create chat session'
    });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}/messages:
 *   get:
 *     summary: Get chat history
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "chat_123456789_abc123"
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         example: 20
 *     responses:
 *       200:
 *         description: Chat message history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatMessage'
 */
router.get('/:chatId/messages', [
  param('chatId').notEmpty().withMessage('Chat ID is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const messages = await chatService.getChatHistory(chatId, limit);
    
    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    logger.error('Error fetching chat messages', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch chat messages'
    });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}/messages:
 *   post:
 *     summary: Send a message to the AI assistant
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "chat_123456789_abc123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "How do I deploy my React app to production?"
 *               repositoryId:
 *                 type: string
 *                 example: "repo_123"
 *     responses:
 *       200:
 *         description: AI assistant response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 response:
 *                   $ref: '#/components/schemas/ChatMessage'
 */
router.post('/:chatId/messages', [
  param('chatId').notEmpty().withMessage('Chat ID is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('repositoryId').optional().isString()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { chatId } = req.params;
    const { message, repositoryId } = req.body;
    const userId = req.user.id;
    
    const response = await chatService.processUserMessage(
      chatId,
      userId,
      message,
      repositoryId
    );
    
    return res.json({
      success: true,
      response
    });
  } catch (error) {
    logger.error('Error processing chat message', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}:
 *   delete:
 *     summary: Delete a chat session
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "chat_123456789_abc123"
 *     responses:
 *       200:
 *         description: Chat session deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Chat session deleted successfully"
 */
router.delete('/:chatId', [
  param('chatId').notEmpty().withMessage('Chat ID is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { chatId } = req.params;
    const userId = req.user.id;
    
    await chatService.deleteChatSession(chatId, userId);
    
    return res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting chat session', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete chat session'
    });
  }
});

export default router; 