import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
      keys: jest.fn(),
      ttl: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setKey', () => {
    it('should call redisClient.set with the correct parameters', async () => {
      await service.setKey('testKey', 'testValue', 1000);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'testKey',
        'testValue',
        'PX',
        1000,
      );
    });

    it('should log and throw an error if redisClient.set fails', async () => {
      const error = new Error('Redis failure');
      mockRedisClient.set.mockRejectedValueOnce(error);

      await expect(
        service.setKey('testKey', 'testValue', 1000),
      ).rejects.toThrow('Redis failure');
    });
  });

  describe('getValue', () => {
    it('should return the value from redisClient.get', async () => {
      mockRedisClient.get.mockResolvedValue('testValue');
      const value = await service.getValue('testKey');
      expect(value).toEqual('testValue');
      expect(mockRedisClient.get).toHaveBeenCalledWith('testKey');
    });

    it('should log and throw an error if redisClient.get fails', async () => {
      const error = new Error('Redis failure');
      mockRedisClient.get.mockRejectedValueOnce(error);
      await expect(service.getValue('testKey')).rejects.toThrow(
        'Redis failure',
      );
    });
  });

  describe('deleteKey', () => {
    it('should call redisClient.del with the key', async () => {
      await service.deleteKey('testKey');
      expect(mockRedisClient.del).toHaveBeenCalledWith('testKey');
    });
  });

  describe('deleteSubset', () => {
    it('should find subset of keys and delete them', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2']);

      await service.deleteSubset('pattern*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('pattern*');
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key2');
    });
  });

  describe('getTTL', () => {
    it('should return TTL multiplied by 1000', async () => {
      mockRedisClient.ttl.mockResolvedValue(100);
      const ttl = await service.getTTL('testKey');
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('testKey');
      expect(ttl).toEqual(100 * 1000);
    });
  });

  describe('onModuleDestroy', () => {
    it('should call redisClient.quit when the module is destroyed', async () => {
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
