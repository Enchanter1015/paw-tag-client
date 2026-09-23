// Types generated from the Paw Tag API OpenAPI spec (http://localhost:3000/api/docs)

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: ApiErrorDetail[];
  };
}

export interface Animal {
  id: string;
  name: string;
  dob?: string | null;
  animalTypeId: number;
  breed?: string | null;
  isStreet: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  images?: AnimalImage[];
}

export interface AnimalImage {
  id: string;
  animalId: string;
  s3Key: string;
  url: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateAnimalInput {
  name: string;
  dob?: string;
  animalTypeId: number;
  breed?: string;
  isStreet?: boolean;
}

export interface UpdateAnimalInput {
  name?: string;
  dob?: string;
  animalTypeId?: number;
  breed?: string;
  isStreet?: boolean;
}

export interface MergeAnimalInput {
  targetId: string;
}

export interface AnimalSearchParams {
  query?: string;
  animalTypeId?: number;
  isStreet?: boolean;
}

export interface Lookup {
  id: number;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  dob?: string | null;
  googleId?: string | null;
  appleId?: string | null;
  phoneNo?: string | null;
  address?: string | null;
  roleId: number;
  isActive: boolean;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  dob?: string;
  googleId?: string;
  appleId?: string;
  phoneNo?: string;
  address?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  dob?: string;
  googleId?: string;
  appleId?: string;
  phoneNo?: string;
  address?: string;
}

export interface VetHospital {
  id: string;
  name: string;
  phoneNo?: string | null;
  address?: string | null;
  businessEmail?: string | null;
  vetHospitalTypeId: number;
  isVerified: boolean;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVetHospitalInput {
  name: string;
  phoneNo?: string;
  address?: string;
  businessEmail?: string;
  vetHospitalTypeId: number;
}

export interface UpdateVetHospitalInput {
  name?: string;
  phoneNo?: string;
  address?: string;
  businessEmail?: string;
  vetHospitalTypeId?: number;
  isVerified?: boolean;
}

export interface VetHospitalMember {
  id: string;
  vetHospitalId: string;
  userId: string;
  roleId: number;
  joinedAt: string;
  updatedAt: string;
}

export interface AddVetHospitalMemberInput {
  userId: string;
  roleId: number;
}

export interface UpdateVetHospitalMemberInput {
  roleId: number;
}

export interface MedicalRecord {
  id: string;
  medicalRecordTypeId: number;
  title: string;
  description?: string | null;
  prescribedBy: string;
  animalId: string;
  administeredAt: string;
  nextDueDate?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  images?: MedicalRecordImage[];
}

export interface MedicalRecordImage {
  id: string;
  medicalRecordId: string;
  s3Key: string;
  url: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateMedicalRecordInput {
  title: string;
  description?: string;
  medicalRecordTypeId: number;
  prescribedBy: string;
  administeredAt?: string;
  nextDueDate?: string;
}

export interface UpdateMedicalRecordInput {
  title?: string;
  description?: string;
  medicalRecordTypeId?: number;
  prescribedBy?: string;
  administeredAt?: string;
  nextDueDate?: string;
}

export interface VerifyMedicalRecordInput {
  verifiedBy: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  dob?: string;
  phoneNo?: string;
  address?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}

// Decoded claims from the JWT access token, used to drive auth state/role checks
export interface AuthUser {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
}

