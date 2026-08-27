import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  EXHAUSTED = 'EXHAUSTED',
}

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column()
  customerId!: string;

  // Chave de idempotência única para evitar cobranças duplas em falhas de rede
  @Index({ unique: true, where: "idempotency_key IS NOT NULL" })
  @Column({ nullable: true, unique: true })
  idempotencyKey!: string;

  @Column({
    type: 'varchar',
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ default: 0 })
  retryCount!: number;

  @Column({ nullable: true })
  lastError!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}