variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-south-1"
}

variable "app_ami_id" {
  description = "AMI ID the running instance was actually launched from. Pinned deliberately - switching this back to a dynamic 'most_recent' lookup will make Terraform try to destroy and recreate the live production server to match whatever AMI is newest at apply time."
  type        = string
  default     = "ami-006f82a1d5a27da54"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.small"
}

variable "project_name" {
  description = "Used to name/tag every resource this config creates"
  type        = string
  default     = "booking-engine"
}

variable "ssh_public_key_path" {
  description = "Path to the public half of a dedicated deploy key"
  type        = string
}

variable "my_ip" {
  description = "SSh is locked to this - Only I can connect."
  type        = string
}
