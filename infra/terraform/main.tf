# Using account's default vpc/aws_subnet
# for a single-instance demo.
data "aws_vpc" "default" {
    default = true
}

data "aws_subnets" "default" {
    filter{
        name = "vpc-id"
        values = [data.aws_vpc.default.id]
    }
}

# Using latest Ubuntu 24.04 LTS 
# Just because it does not go stale over time.
data "aws_ami" "ubuntu" {
    most_recent = true
    owners = ["099720109477"]

    filter {
        name = "name"
        values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
    }
}

resource "aws_key_pair" "deployer" {
    key_name = "${var.project_name}-deploy-key"
    public_key = file(var.ssh_public_key_path)
}

resource "aws_security_group" "app" {
    name = "${var.project_name}-sg"
    description = "SSH from my IP only; HTTP/HTTPS from anywhere"
    vpc_id = data.aws_vpc.default.id

    ingress {
        description = "SSH - restricted to my IP"
        from_port = 22
        to_port = 22
        protocol = "tcp"
        cidr_blocks = [var.my_ip]
    }

    ingress {
        description = "HTTP"
        from_port = 80
        to_port = 80
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    ingress {
        description = "HTTPS - not used yet(no domain/TLS configured), TODO: Open when I have one"
        from_port = 443
        to_port = 443
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        description = "Allow all outbound (docker pulls, apt, npm, Razorpay/Google API calls, etc.)"
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = {
        name = "${var.project_name}-sg"
    }
}

resource "aws_instance" "app" {
    ami = data.aws_ami.ubuntu.id
    instance_type = var.instance_type
    subnet_id = data.aws_subnets.default.ids[0]
    key_name = aws_key_pair.deployer.key_name
    vpc_security_group_ids = [aws_security_group.app.id]


    root_block_device {
        volume_size = 20 # GB
        volume_type = "gp3"
    }

    user_data = file("${path.module}/scripts/user_data.sh")

    tags = {
        Name = "${var.project_name}-app"
    }

}

# Without this, the instance's public IP changes every time it stops/starts,
# which would bread DNS, Github secrets, and client's bookmark.
resource "aws_eip" "app" {
    instance = aws_instance.app.id
    domain = "vpc"

    tags = {
        Name = "${var.project_name}-eip"
    }
}