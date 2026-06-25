output "public_ip" {
    description = "Elastic IP of the app server. This is app's address - doesn't change on restart"
    value = aws_eip.app.public_ip
}

output "ssh_command" {
    description = "Run this to connect to the server"
    value = "ssh -i /home/henil/Documents/clients/private-keys ubuntu@${aws_eip.app.public_ip}"
}