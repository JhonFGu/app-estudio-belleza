import handler from '../api/dashboard';

async function runHandler() {
  const req = {
    method: 'GET',
    headers: {
      'x-tenant-id': 'd6f127ca-16da-4417-b525-97a788d29c1d'
    },
    query: {
      period: 'month'
    },
    url: '/api/dashboard?period=month'
  };
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      console.log('STATUS CODE:', this.statusCode);
      console.log('JSON RESPONSE:', JSON.stringify(data, null, 2));
      return this;
    },
    end() {
      console.log('END');
    }
  };

  await handler(req, res);
}
runHandler();
