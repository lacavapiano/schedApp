import express from 'express' ;

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Hello from Express!',
    timestamp: new Date().toISOString()
  });
});

export default router;