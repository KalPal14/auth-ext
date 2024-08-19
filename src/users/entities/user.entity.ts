import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../enums/role.enum';
import { ApiKey } from './api-key.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ enum: Role, default: Role.Regular })
  role: Role;

  @Column({ default: false })
  otpEnabled: boolean;

  @Column({ nullable: true })
  otpSecret: string;

  @JoinTable()
  @ManyToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKey: ApiKey;
}
