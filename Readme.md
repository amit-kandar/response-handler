# 🧩 Unified Response Handler

Seamless response and error handler for REST and Socket.IO with optional global template configuration.

## 🚀 Installation

```bash
npm install @your-scope/unified-response-handler
```

## ✅ Features

- Unified response structure across REST & Socket
- Plug-and-play Express and Socket.IO support
- Custom error types: `AppError`, `ValidationError`, `NotFoundError`
- Optional global template override

## 📦 Usage

### Configure Template (optional)

```js
const { configureResponseFormat } = require('@your-scope/unified-response-handler');

configureResponseFormat(({ success, message, data, error }) => ({
  status: success ? 'OK' : 'FAIL',
  message,
  ...(success ? { result: data } : { issue: error }),
  time: Date.now(),
}));
```

### REST

```js
const {
  sendSuccess,
  errorHandler,
  ValidationError,
} = require('@your-scope/unified-response-handler');

app.get('/user', (req, res, next) => {
  if (!req.query.id) return next(new ValidationError({ id: 'Required' }));
  sendSuccess(res, { id: req.query.id, name: 'Amit' }, 'Fetched');
});

app.use(errorHandler);
```

### Socket.IO

```js
const { emitSuccess, emitError, ValidationError } = require('@your-scope/unified-response-handler');

socket.on('get-user', async (data) => {
  try {
    if (!data.user_id) throw new ValidationError({ user_id: 'Required' });
    emitSuccess({ socket, event: 'user-data', data: { id: data.user_id, name: 'Amit' } });
  } catch (err) {
    emitError({ socket, event: 'user-data', error: err });
  }
});
```

## 👨‍💻 Development

- Clone this repo
- Run tests (if added) and lint code
- Submit pull requests with your improvements

## 📜 License

MIT © Your Name
