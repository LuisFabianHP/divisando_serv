const validateUserAgent = require('@middlewares/validateUserAgent');

describe('Middleware: validateUserAgent', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} }; // Simulación de solicitud HTTP
    res = {}; // Respuesta simulada
    next = jest.fn(); // Mock de la función next
  });

  test('Debe permitir solicitudes con un User-Agent válido', () => {
    req.headers['user-agent'] = 'MiAplicacionMovil/1.0';

    validateUserAgent(req, res, next);

    expect(next).toHaveBeenCalled(); // Verifica que next() fue llamado
    expect(next).not.toHaveBeenCalledWith(expect.any(Error)); // No debe haber errores
  });

  test('Debe bloquear solicitudes con un User-Agent no autorizado', () => {
    req.headers['user-agent'] = 'NavegadorDesconocido/2.0';

    validateUserAgent(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error)); // Verifica que se llamó a next con un error
    const error = next.mock.calls[0][0]; // Captura el error pasado a next
    expect(error.message).toBe('User-Agent no autorizado.');
    expect(error.status).toBe(403);
  });

  test('Debe bloquear solicitudes sin un User-Agent', () => {
    validateUserAgent(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error)); // Verifica que se llamó a next con un error
    const error = next.mock.calls[0][0]; // Captura el error pasado a next
    expect(error.message).toBe('User-Agent no autorizado.');
    expect(error.status).toBe(403);
  });
});
