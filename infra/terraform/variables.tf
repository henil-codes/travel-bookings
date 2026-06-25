variable "aws_region" {
    description = "AWS region to deploy into."
    type = string
    default = "ap-south-1"
}

variable "instance_type" {
    description = "EC2 instance type."
    type = string
    default = "t3.small"
}

variable "project_name" {
    description = "Used to name/tag every resource this config creates"
    type = string
    default = "booking-engine"
}

variable "ssh_public_key_path" {
    description = "Path to the public half of a dedicated deploy key"
    type = string
}

variable "my_ip" {
    description = "SSh is locked to this - Only I can connect."
    type = string
}