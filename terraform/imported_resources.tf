resource "aws_vpc" "my_vpc" {
  assign_generated_ipv6_cidr_block = false
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true
  instance_tenancy = "default"
}
