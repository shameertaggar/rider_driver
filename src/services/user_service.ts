import { User, Ride } from '../models/modelsIndex.js';
import { UserRepository, RideRepository } from '../db/dbIndex.js';

export interface RegisterUserDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export class UserService {
  private userRepo: UserRepository;
  private rideRepo: RideRepository;

  constructor(userRepo = new UserRepository(), rideRepo = new RideRepository()) {
    this.userRepo = userRepo;
    this.rideRepo = rideRepo;
  }

  public registerUser(dto: RegisterUserDto): User {
    if (!dto.id || !dto.name) throw new Error('User ID and Name are required');
    if (this.userRepo.exists(dto.id)) throw new Error(`User ${dto.id} already exists`);

    const user: User = {
      id: dto.id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      createdAt: new Date(),
    };
    return this.userRepo.save(user);
  }

  public getUser(userId: string): User {
    const user = this.userRepo.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    return user;
  }

  public getAllUsers(): User[] {
    return this.userRepo.findAll();
  }

  public getUserRideHistory(userId: string): { ongoing: Ride[]; completed: Ride[]; all: Ride[] } {
    this.getUser(userId); // ensure exists
    return {
      ongoing: this.rideRepo.findOngoingRidesByUserId(userId),
      completed: this.rideRepo.findCompletedRidesByUserId(userId),
      all: this.rideRepo.findByUserId(userId),
    };
  }
}
