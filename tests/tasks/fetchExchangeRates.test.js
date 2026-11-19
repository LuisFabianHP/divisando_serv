const mockAxiosGet = jest.fn();
const mockTaskLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const emptyQuery = (result) => {
  const query = {
    sort: () => query,
    select: () => query,
    lean: () => Promise.resolve(result),
  };
  return query;
};

const loadFetchExchangeRates = () => {
  jest.resetModules();
  jest.doMock('axios', () => ({ get: mockAxiosGet }));
  jest.doMock('node-cron', () => ({ schedule: jest.fn() }));
  jest.doMock('@utils/logger', () => ({ taskLogger: mockTaskLogger }));
  jest.doMock('@models/ExchangeRate', () => ({
    findOne: () => emptyQuery(null),
    create: jest.fn().mockResolvedValue({}),
  }));
  jest.doMock('@models/CurrentExchangeRate', () => ({
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    distinct: jest.fn().mockResolvedValue([]),
  }));
  jest.doMock('@models/AvailableCurrencies', () => ({
    findOne: () => emptyQuery(null),
    updateOne: jest.fn().mockResolvedValue({}),
  }));
  jest.doMock('@models/RateChangeAlert', () => ({
    insertMany: jest.fn().mockResolvedValue([]),
  }));
  return require('../../tasks/fetchExchangeRates');
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('updateExchangeRates', () => {
  const T0 = Date.UTC(2026, 10, 18, 12, 0, 0);
  let dateNow;

  beforeEach(() => {
    mockAxiosGet.mockReset();
    Object.values(mockTaskLogger).forEach((fn) => fn.mockClear());
    process.env.EXCHANGE_RATE_API_KEY = 'key-test';
    process.env.EXCHANGE_RATE_API_URL = 'https://rates.example.com/';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    dateNow = jest.spyOn(Date, 'now').mockReturnValue(T0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('envía timeout en cada petición a la API de tasas', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { conversion_rates: { USD: 1 }, time_last_update_utc: 'Wed, 18 Nov 2026 12:00:00 +0000' },
    });
    const { updateExchangeRates } = loadFetchExchangeRates();

    await updateExchangeRates();

    expect(mockAxiosGet).toHaveBeenCalled();
    mockAxiosGet.mock.calls.forEach(([, options]) => {
      expect(options).toEqual({ timeout: 15000 });
    });
  });

  it('salta corridas mientras la anterior está activa y la reemplaza si excede el tiempo máximo', async () => {
    mockAxiosGet.mockImplementation(() => new Promise(() => {}));
    const { updateExchangeRates } = loadFetchExchangeRates();

    updateExchangeRates();
    await flushPromises();
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);

    dateNow.mockReturnValue(T0 + 60 * 1000);
    await updateExchangeRates();
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    expect(mockTaskLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ya está en ejecución'));

    dateNow.mockReturnValue(T0 + 11 * 60 * 1000);
    updateExchangeRates();
    await flushPromises();
    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
  });
});
