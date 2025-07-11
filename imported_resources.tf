resource "aws_instance" "aws_ec2" {
  ami = "ami-0fa88f99504362a8b"
  associate_public_ip_address = false
  availability_zone = "il-central-1a"
  iam_instance_profile = ""
  instance_type = "t3.xlarge"
  key_name = "ELK-IIS_Project"
  private_ip = "10.0.1.8"
  subnet_id = "subnet-096c3f4df42dca912"
  vpc_security_group_ids = ["sg-0599ee6ad33bd0df2"]
}
