import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string;

  @Column({ unique: true })
  uuid: string;

  @ManyToMany(() => User, (user) => user.apiKey)
  user: User;
}
